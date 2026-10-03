// Shared marketing markup: keep the homepage, pricing page and SEO generator aligned.
export function websitePricingSection(buttonHref = '/download/') {
  const plans = [
    ['hour','3 Hour Pack','₹499','$5.99','₹999','$12',3,0,false],
    ['hour','10 Hour Pack','₹1,499','$16.99','₹2,499','$29',10,0,true],
    ['month','Monthly','₹3,499','$39.99','₹6,499','$69',0,1,false],
    ['month','3 Months','₹7,999','$89.99','₹10,499','$120',0,3,true],
    ['year','Yearly','₹19,499','$202','₹42,499','$480',0,12,true],
  ];
  const cards = plans.map(([category,name,inr,usd,oldInr,oldUsd,hours,months,popular]) => {
    const features = [
      ...(hours ? [`${hours} hours of live interview help`] : []),
      'Undetectability - Cluegent stays invisible during screen sharing',
      ...(!hours ? ['Unlimited AI interview assistance','Unlimited AI requests'] : []),
      `${hours ? '' : 'Unlimited '}Screen capture analysis`,
      'Real-time assistant','Coding + meeting support',
      `${hours === 3 ? '30' : hours === 10 ? '75' : 'Unlimited'} AI Resume Builder (all templates)`,
      'Watermark-free resumes.',
    ];
    const equivalent = months === 3 ? ['₹2,666.33','$30.00'] : ['₹1,624.92','$16.83'];
    return `<article class="pricing-card ${popular ? 'pricing-card--pro' : 'pricing-card--green'}" data-pricing-category="${category}" ${category !== 'month' ? 'hidden' : ''}>
      <div class="pricing-card-head">
        <h3>${name}</h3>
        <p class="pricing-offer"><del class="pricing-original" data-pricing-original data-original-inr="${oldInr}" data-original-usd="${oldUsd}">${oldInr}</del></p>
        <p class="pricing-price"><span data-pricing-price data-price-inr="${inr}" data-price-usd="${usd}">${inr}</span>${popular ? '<span class="pricing-badge">Most Popular</span>' : ''}</p>
        <p class="pricing-note">${hours ? 'One-time purchase · no monthly reset' : months === 1 ? 'One month · paid upfront' : `<span data-pricing-price data-price-inr="${equivalent[0]}" data-price-usd="${equivalent[1]}">${equivalent[0]}</span>/month equivalent · paid upfront for ${months} months`}</p>
        ${months ? '<p class="pricing-note">200 listening hours per month. Refreshes each monthly anniversary; unused hours do not roll over.</p>' : ''}
      </div>
      <ul>${features.map(text => `<li>${text}</li>`).join('')}</ul>
      <a class="pricing-button" href="${buttonHref}">Upgrade</a>
    </article>`;
  }).join('\n');
  return `<section class="section pricing-section" id="pricing" aria-labelledby="pricing-title">
    <div class="section-heading reveal"><p class="section-kicker">Pricing</p><h2 id="pricing-title">Choose the Cluegent plan that fits your interview flow</h2><p>Start with a 12-minute free trial, then choose hourly packs or prepaid monthly access.</p></div>
    <div class="pricing-toolbar reveal">
      <div class="pricing-currency-toggle" role="tablist" aria-label="Plan duration" data-pricing-category-toggle>
        <button id="pricing-hour" type="button" role="tab" aria-selected="false" aria-controls="website-pricing-plans" tabindex="-1" data-pricing-tab="hour">Hourly</button>
        <button id="pricing-month" type="button" role="tab" aria-selected="true" aria-controls="website-pricing-plans" data-pricing-tab="month">Monthly</button>
        <button id="pricing-year" type="button" role="tab" aria-label="Yearly" aria-selected="false" aria-controls="website-pricing-plans" tabindex="-1" data-pricing-tab="year">Yearly <span class="pricing-badge">50% off</span></button>
      </div>
      <div class="pricing-currency-toggle" role="group" aria-label="Choose pricing currency" data-pricing-currency-toggle>
        <button type="button" aria-pressed="true" data-pricing-currency="INR"><span class="pricing-currency-flag pricing-currency-flag--inr" aria-hidden="true"><span></span></span>INR</button>
        <button type="button" aria-pressed="false" data-pricing-currency="USD"><span class="pricing-currency-flag pricing-currency-flag--usd" aria-hidden="true"><span></span></span>USD</button>
      </div>
    </div>
    <div class="pricing-grid reveal" id="website-pricing-plans" role="tabpanel" aria-labelledby="pricing-month">${cards}</div>
    <div class="pricing-trial reveal"><div><h3>Free Trial</h3><p>12 minutes total Cluegent usage. Try live answers, real-time assistance and screenshot analysis.</p></div><a class="pricing-button" href="${buttonHref}">Start free</a></div>
    <p class="pricing-note pricing-terms">Prepaid plans do not automatically charge again. Upgrade in the Cluegent app. Listening is limited to the hours included in your plan.</p>
  </section>`;
}
