//! Store updates run in a libuv worker, never blocking Electron's UI thread.
use napi::bindgen_prelude::*;
use windows::core::ComInterface;
use windows::Services::Store::{StoreContext, StorePackageUpdateState};
use windows::Win32::Foundation::HWND;
use windows::Win32::System::WinRT::{RoInitialize, RoUninitialize, RO_INIT_MULTITHREADED};
use windows::Win32::UI::Shell::IInitializeWithWindow;

pub struct StoreUpdateTask {
    window: isize,
    install: bool,
}

struct Apartment;
impl Drop for Apartment {
    fn drop(&mut self) { unsafe { RoUninitialize() } }
}

impl Task for StoreUpdateTask {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> napi::Result<String> {
        let run = || -> windows::core::Result<String> {
            unsafe { RoInitialize(RO_INIT_MULTITHREADED)?; }
            let _apartment = Apartment;
            let context = StoreContext::GetDefault()?;
            let interop: IInitializeWithWindow = context.cast()?;
            unsafe { interop.Initialize(HWND(self.window))?; }
            let updates = context.GetAppAndOptionalStorePackageUpdatesAsync()?.get()?;
            if updates.Size()? == 0 { return Ok("current".into()); }
            if !context.CanSilentlyDownloadStorePackageUpdates()? {
                return Ok("store-required".into());
            }
            let result = if self.install {
                context.TrySilentDownloadAndInstallStorePackageUpdatesAsync(&updates)?.get()?
            } else {
                context.TrySilentDownloadStorePackageUpdatesAsync(&updates)?.get()?
            };
            if result.OverallState()? == StorePackageUpdateState::Completed {
                Ok(if self.install { "installed" } else { "ready" }.into())
            } else {
                // Includes metered-network, low-battery and canceled operations.
                Ok("store-required".into())
            }
        };
        run().map_err(|err| napi::Error::from_reason(format!("Microsoft Store update failed: {err}")))
    }

    fn resolve(&mut self, _env: Env, output: String) -> napi::Result<String> { Ok(output) }
}

#[napi]
pub fn update_from_store(window_handle: Buffer, install: bool) -> napi::Result<AsyncTask<StoreUpdateTask>> {
    let window = match window_handle.len() {
        8 => u64::from_le_bytes(window_handle.as_ref().try_into().unwrap()) as isize,
        4 => u32::from_le_bytes(window_handle.as_ref().try_into().unwrap()) as isize,
        _ => return Err(napi::Error::from_reason("Invalid native window handle")),
    };
    Ok(AsyncTask::new(StoreUpdateTask { window, install }))
}
