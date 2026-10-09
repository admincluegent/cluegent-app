from pathlib import Path
import shutil
root=Path('/Users/prithivi/cluegent/cluegent-app/native-module')
lab=Path('/tmp/cluegent-stt-native-investigation')
candidate=lab/'candidate'
shutil.copytree(lab/'source',candidate,dirs_exist_ok=True)
p=candidate/'src/speaker/core_audio.rs'
s=(root/'src/speaker/core_audio.rs').read_text()
s=s.replace('    channels: u32,','    channels: u32,\n    sequence: u64,')
s=s.replace('let output_uid = output_device.uid()?;', '''let output_uid = output_device.uid()?;
        let device_rate = output_device.actual_sample_rate()
            .or_else(|_| output_device.nominal_sample_rate())?;
        anyhow::ensure!(device_rate.is_finite() && device_rate >= 8000.0 && device_rate <= 192000.0, "Invalid output clock");''')
s=s.replace('AtomicU32::new(asbd.sample_rate as u32)', 'AtomicU32::new(device_rate.round() as u32)')
s=s.replace('            channels,','            channels,\n            sequence: 0,')
s=s.replace('        let format = av::AudioFormat::with_asbd(&asbd).unwrap();','''        anyhow::ensure!(asbd.bits_per_channel == 32 && asbd.format_flags.0 & 1 != 0 && asbd.format_flags.0 & 2 == 0, "Expected native little-endian Float32 PCM");
        let format = av::AudioFormat::with_asbd(&asbd).ok_or_else(|| anyhow::anyhow!("Invalid ASBD"))?;
        println!("[CaptureCandidate] device_rate={} asbd_rate={} channels={} flags={}", device_rate, asbd.sample_rate, asbd.channels_per_frame, asbd.format_flags.0);''')
a=s.index('    // BUGFIX: Do NOT overwrite')
b=s.index('\n    os::Status::NO_ERR',a)
s=s[:a]+'''    // Isolated prototype: reject unsupported layouts rather than guessing channels.
    if input_data.number_buffers != 1 { return os::Status::NO_ERR; }
    let buffer = &input_data.buffers[0];
    let channels = buffer.number_channels as usize;
    let bytes = buffer.data_bytes_size as usize;
    if channels == 0 || bytes % (4 * channels) != 0 || buffer.data.is_null()
        || buffer.data as usize % std::mem::align_of::<f32>() != 0 {
        eprintln!("[CaptureCandidate] rejected PCM layout");
        return os::Status::NO_ERR;
    }
    let data = unsafe { std::slice::from_raw_parts(buffer.data as *const f32, bytes / 4) };
    if data.iter().any(|s| !s.is_finite()) { return os::Status::NO_ERR; }
    println!("[CaptureClock] seq={} frames={} channels={} bytes={} host={} sample={} flags={} rate={}",
        ctx.sequence, bytes / (4 * channels), channels, bytes,
        _input_time.host_time, _input_time.sample_time, _input_time.flags.0,
        ctx.current_sample_rate.load(Ordering::Acquire));
    ctx.sequence += 1;
    push_audio(ctx, data, channels as u32);
''' + s[b:]
p.write_text(s)
p=candidate/'src/lib.rs';s=p.read_text().replace('(native_rate as usize / 1000) * 20','((native_rate as f64 * 0.020).round() as usize)');p.write_text(s)
print(candidate)
