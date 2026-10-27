// Edit this file to change what shows on the Routine page.
// `at` = minutes after midnight (used to highlight what's happening now).

export const SCHEDULE = [
  { name: 'Morning', items: [
    { at: 660, time: '11:00–11:30', what: 'Posture Block A (stretches) and a glass of water', note: 'Breaks up the sitting right after school.' },
    { at: 720, time: '12:00', what: 'Lunch' }
  ]},
  { name: 'Afternoon', items: [
    { at: 915, time: '~3:15', what: 'Pre-workout snack' },
    { at: 960, time: '4:00–5:00', what: 'Lift (PPL day)', lift: true },
    { at: 1020, time: '5:00–5:20', what: 'Cardio finisher' },
    { at: 1040, time: '5:20–5:30', what: 'Cooldown stretch, then post-workout snack' },
    { at: 1050, time: '5:30–6:00', what: 'Shower and the Looking Good / hygiene stuff' }
  ]},
  { name: 'Evening', items: [
    { at: 1170, time: '~7:30–8:00', what: 'Dinner', note: 'Try for earlier than 9:30. Late meals hurt sleep and recovery.' },
    { at: 1320, time: '10:00–10:30', what: 'Floss, brush, prep, sleep', note: 'Aim for 8–9 hours. Sleep is when you build muscle.' }
  ]}
]

export const POSTURE = {
  intro: 'Your doctor’s exercises are the backbone. Follow the sets, reps and holds on your sheet where it gives them. The numbers here are just defaults.',
  blocks: [
    { id: 'A', title: 'Block A', sub: 'Daily, 20–30 min · stiffness and mobility', items: [
      ['Chin tucks', '2 × 10, hold 5 sec'],
      ['Scapular retraction, arms at side', '2 × 10'],
      ['Shoulder backward rolls', '10'],
      ['Scalene and upper trap stretch', '2 × 30 sec each side'],
      ['Levator scapulae stretch', '2 × 30 sec each side'],
      ['Doorway pec stretch', '2 × 30–45 sec'],
      ['Mid-back stretch and cat-camel', '10 reps'],
      ['Child’s pose side stretch', '2 × 30 sec each side'],
      ['Posterior pelvic tilt', '2 × 10, hold 5 sec'],
      ['Supine and seated hamstring stretches', '2 × 30–45 sec each leg']
    ]},
    { id: 'B', title: 'Block B', sub: 'Strength, 3–4× a week · rest days, or warm-up/finisher on pull days', items: [
      ['Band rows and resisted shoulder extension', '3 × 12–15'],
      ['Prone Y-T-I and prone W’s on the ball', '2 × 8–10 each'],
      ['Supine shoulder W’s with band', '2 × 12'],
      ['D2 flexion with band, then foam roller', '2 × 10'],
      ['Ball push-ups', '2 × 8–10'],
      ['Bridge with physio ball', '3 × 12']
    ]},
    { id: 'X', title: 'Also worth doing', sub: 'for anterior pelvic tilt and flat feet', tag: 'Ask your doctor', items: [
      ['Hip flexor stretch (half-kneeling, squeeze the glute)', '2 × 30–45 sec each side'],
      ['Short-foot exercise (lift the arch, don’t curl your toes)', '10 reps × 5 sec'],
      ['Single-leg balance while brushing your teeth', 'Daily']
    ]}
  ]
}

// period = days a tick stays "done" (1 = resets every day)
export const HYGIENE = {
  groups: [
    { name: 'Daily', period: 1, items: [
      { id: 'h-brush', text: 'Brush morning and night', sub: '2 minutes each' },
      { id: 'h-floss', text: 'Floss at night' },
      { id: 'h-tongue', text: 'Tongue scrape in the morning' },
      { id: 'h-face', text: 'Wash face morning and night', sub: 'Use a face towel' },
      { id: 'h-spf', text: 'Moisturizer and SPF in the morning' },
      { id: 'h-deo', text: 'Deodorant, clean underwear and socks' },
      { id: 'h-water', text: 'Drink 2–3 liters of water', sub: 'Fill a 1 L bottle and finish it by 12, 4, and 8 pm' },
      { id: 'h-scalp', text: 'Scalp massage, 3–5 minutes', sub: 'Fingertips, not nails, in the shower' },
      { id: 'h-sit', text: 'Change sitting position every 30–45 minutes' }
    ]},
    { name: 'Every 2–3 days', period: 3, items: [
      { id: 'h-shampoo', text: 'Shampoo scalp only, conditioner on mid-lengths to ends', sub: 'Lukewarm water, not hot. Too often dries you out, too rarely worsens dandruff.' },
      { id: 'h-facetowel', text: 'Fresh face towel' }
    ]},
    { name: 'Weekly', period: 7, items: [
      { id: 'h-bedding', text: 'Wash body towel and bedding in hot water', sub: 'Helps the morning runny nose' },
      { id: 'h-nails', text: 'Trim and clean nails', sub: 'Fingers weekly, toes every 2 weeks' },
      { id: 'h-shave', text: 'Shave', sub: 'Depending on your growth rate' },
      { id: 'h-exfol', text: 'Exfoliate or use a face mask once' },
      { id: 'h-phone', text: 'Clean your phone screen' },
      { id: 'h-bottle', text: 'Clean your water bottle, wipe keyboard and desk' }
    ]},
    { name: 'Monthly', period: 30, items: [
      { id: 'h-hair', text: 'Haircut or trim' },
      { id: 'h-razor', text: 'Replace razor blade as needed' },
      { id: 'h-tbrush', text: 'Replace toothbrush head', sub: 'Every 3 months' },
      { id: 'h-towels', text: 'Wash hand towel, pillow protector and shower curtain' },
      { id: 'h-clothes', text: 'Check clothes and shoes, clean your shoes' },
      { id: 'h-photos', text: 'Progress photos and body measurements', sub: 'Same lighting, same time' }
    ]}
  ],
  notes: [
    { title: 'Dandruff vs. dry scalp', body: 'Dandruff gives larger, yellowish or oily flakes. Dry scalp gives small white flakes, with tightness and dryness elsewhere too. If you can’t tell, use a dandruff shampoo with zinc pyrithione or ketoconazole 2× a week for 4 weeks. If it doesn’t improve, see a dermatologist.' },
    { title: 'Hair loss', body: 'A tight scalp can contribute, so the massage is a good idea. But hair loss usually comes from genetics, stress, or low protein, iron, or vitamin D. If it keeps going, check with a doctor, since that’s easy to test.' },
    { title: 'Morning runny nose', body: 'Usually dust-mite or dry-air allergies. Wash bedding weekly in hot water, use a pillow cover, shower before bed, keep pets off the bed, and try a saline rinse. If it continues, ask a doctor about allergy medication.' },
    { title: 'Towels', body: 'Your plan of 3 is good: face (swap every 2–3 days), body (weekly), and hands (2–3 days).' },
    { title: 'Mewing and jawline', body: 'Mewing and thumb or fascia pulling are harmless, but the evidence that they change adult jaw structure is weak. A visible jawline and face slimming come mostly from losing body fat, so that’s where your effort pays off.' }
  ]
}

export const FOOD = {
  intro: 'Aim for roughly 0.7–1 gram of protein per pound of bodyweight each day, with a small calorie deficit (not a crash diet). That lets you lose fat and build muscle slowly together.',
  meals: [
    { name: 'Lunch · ~12:00', ideas: ['Chicken or tuna rice bowl with veggies', 'Turkey and cheese whole-grain sandwich or wrap', 'Egg and bean burrito', 'Pasta with ground turkey', 'Leftovers from dinner'] },
    { name: 'Pre-workout · ~3:15', note: 'Keep it small and easy to digest.', ideas: ['Banana + peanut butter', 'Apple + string cheese', 'Plain Greek yogurt + fruit', 'Toast with an egg'] },
    { name: 'Post-workout · ~5:20', ideas: ['Greek yogurt + protein granola (what you already do)', 'Protein shake + banana', 'Cottage cheese + fruit', 'Turkey sandwich', '2–3 hard-boiled eggs'] },
    { name: 'Dinner · ~7:30–8:00', ideas: ['Chicken, salmon, lean beef, or tofu + a big serving of veggies + rice, potato, or whole-grain pasta'] },
    { name: 'If hungry late', ideas: ['Cottage cheese or a small bowl of Greek yogurt'] }
  ],
  swaps: [
    ['Takis or Doritos', 'Salty and crunchy', 'Roasted chickpeas, popcorn, seaweed snacks, jerky, or baked tortilla chips + black bean dip'],
    ['Rice Krispy treats', 'Sweet', 'Greek yogurt + honey and berries, banana + PB, frozen grapes, a bit of dark chocolate'],
    ['Goldfish', '', 'String cheese, cheese + whole-grain crackers, or roasted edamame'],
    ['Kirkland Chewy Bars', '', 'A protein bar (15g+ protein, under 8g sugar) or trail mix in a portioned handful']
  ],
  tip: 'Hard-boil 6 eggs on Sunday, pre-portion snacks into small bags, and keep the junk out of the house. If it’s not within reach, you can’t grab it on autopilot.'
}
