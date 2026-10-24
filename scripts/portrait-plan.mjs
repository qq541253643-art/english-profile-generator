const settings = [
  'a quiet apartment kitchen', 'a modest home office', 'a neighborhood coffee shop',
  'a covered front porch', 'a leafy residential sidewalk', 'a public library aisle',
  'a softly lit living room', 'a small backyard', 'a plain apartment hallway',
  'a local park path', 'a grocery store entrance', 'a simple dining room',
  'a community center lobby', 'a sunlit garage doorway', 'a bookstore corner',
  'a bus stop on a calm street', 'a laundromat waiting area', 'a casual office break room',
  'a farmers market walkway', 'a neutral bedroom wall',
]

// 本地生成使用无人流、无招牌的私密日常场景，降低背景多脸和伪文字。
const localSettings = [
  'a quiet apartment kitchen', 'a modest home office',
  'a covered front porch', 'a leafy backyard',
  'a softly lit living room', 'a plain apartment hallway',
  'a simple dining room', 'a sunlit garage doorway',
  'a neutral bedroom wall', 'a quiet home entryway',
]

const indoorLight = [
  'indirect window light', 'ordinary warm indoor light', 'bright but diffused window light',
  'mixed window and room light', 'soft daylight from a nearby window',
]

const outdoorLight = [
  'soft overcast daylight', 'late afternoon natural light',
  'bright but diffused morning light', 'open shade with natural color',
]

const expressions = [
  'a relaxed closed-mouth smile', 'a subtle friendly half-smile', 'a calm neutral expression',
  'a spontaneous small smile', 'an attentive everyday expression',
  'a mildly amused expression', 'a comfortable unposed look',
]

const framing = [
  'head-and-shoulders framing', 'loose shoulders-up framing', 'upper-chest portrait framing',
  'slightly off-center head-and-shoulders framing', 'casual arm-length phone framing',
]

const faceShapes = [
  'a long oval face with a narrow chin', 'a broad square face with a strong jaw',
  'a soft round face with full cheeks', 'a heart-shaped face with a wider forehead',
  'an oblong face with a high forehead', 'a compact oval face with a gently pointed chin',
  'a pear-shaped face with a broader jaw', 'an angular diamond-shaped face with high cheekbones',
]

const localFaceShapes = [
  'long oval face and narrow chin', 'broad square face and strong jaw',
  'soft round face and full cheeks', 'heart-shaped face and wide forehead',
  'oblong face and high forehead', 'compact oval face and pointed chin',
  'pear-shaped face and broad jaw', 'diamond face and high cheekbones',
]

const eyeTraits = [
  'deep-set gray-blue eyes with close spacing', 'wide-set hazel eyes with slightly hooded lids',
  'small green eyes with visible lower-lid creases', 'almond-shaped brown eyes with uneven lid folds',
  'round blue eyes with a mildly heavier left eyelid', 'light hazel eyes beneath a pronounced brow ridge',
  'gray-green eyes with subtle crow’s-feet', 'dark blue eyes with naturally sparse lashes',
]

const localEyeTraits = [
  'close-set gray-blue eyes', 'wide-set hooded hazel eyes',
  'small green eyes', 'almond brown eyes',
  'round blue eyes', 'light hazel eyes',
  'gray-green eyes', 'dark blue eyes',
]

const noseTraits = [
  'a short upturned nose', 'a long straight nose with a narrow bridge',
  'a softly crooked nose with a rounded tip', 'a broad natural nose with a low bridge',
  'a prominent aquiline nose', 'a small nose with a slightly uneven nostril line',
  'a medium nose with a blunt tip', 'a narrow nose with a faint bridge bump',
]

const localNoseTraits = [
  'short upturned nose', 'long straight narrow nose',
  'slightly crooked rounded nose', 'broad low-bridge nose',
  'prominent aquiline nose', 'small subtly uneven nose',
  'medium blunt-tip nose', 'narrow bump-bridge nose',
]

const localLipAndChinTraits = [
  'thin upper lip and round chin', 'wide mouth and square chin',
  'medium lips and pointed chin', 'narrow uneven mouth and cleft chin',
  'full lips and broad round chin', 'asymmetric smile and recessed chin',
  'sharp cupid bow and long chin', 'broad lower lip and angular chin',
  'small lips and soft double chin', 'wide smile and prominent chin',
]

const localCheekAndForeheadTraits = [
  'low cheeks and broad forehead', 'high cheeks and compact forehead',
  'full cheeks and low hairline', 'hollow cheeks and tall forehead',
  'asymmetric cheeks and round forehead', 'flat cheeks and strong brow ridge',
  'wide cheeks and hollow temples', 'soft midface and sloped forehead',
]

const browTraits = [
  'straight light brows', 'thick brows with a small natural gap',
  'fine arched brows', 'low-set medium brows',
  'uneven softly curved brows', 'full brows with a few stray hairs',
]

const lipAndChinTraits = [
  'thin upper lip, fuller lower lip, and a rounded chin',
  'a wide mouth, defined cupid’s bow, and a short square chin',
  'medium lips with a longer philtrum and a softly pointed chin',
  'a narrow mouth with naturally uneven corners and a cleft chin',
  'full lips with a short philtrum and a broad rounded chin',
  'a slightly asymmetric smile line and a recessed chin',
  'a pronounced cupid’s bow and a long narrow chin',
  'a broad lower lip and a firm angular chin',
  'small balanced lips and a softly doubled chin line',
  'a wide closed-mouth smile and a prominent chin',
]

const cheekAndForeheadTraits = [
  'low cheekbones and a high broad forehead',
  'prominent cheekbones and a compact forehead',
  'soft full cheeks and a low hairline',
  'hollow cheeks and a tall narrow forehead',
  'one cheek slightly fuller than the other and a rounded forehead',
  'flat cheek planes and a pronounced brow ridge',
  'wide cheekbones and a visible temple hollow',
  'a soft midface with a gently sloped forehead',
]

const cameraAngles = [
  'nearly straight-on at eye level', 'a subtle three-quarter angle from the left',
  'a subtle three-quarter angle from the right', 'the phone held just above eye level',
  'the camera slightly below eye level without distortion', 'a mild natural head turn while the eyes meet the lens',
]

const complexionTraits = [
  'fair neutral skin with a little sun redness', 'light warm skin with scattered freckles',
  'fair rosy skin with visible tone variation', 'light olive skin with mild under-eye shadow',
  'pale cool skin with a few small blemishes', 'light peach skin with uneven sun exposure',
]

const localComplexionTraits = [
  'fair neutral skin', 'warm freckled skin', 'fair rosy skin',
  'light olive skin', 'pale cool skin', 'light peach skin',
]

const identityMarkers = [
  'a shallow chin dimple', 'one noticeably stronger cheek dimple',
  'a small natural beauty mark near the left cheek', 'strong freckles across the nose and upper cheeks',
  'a slightly wider smile with one subtly rotated front tooth', 'thin rectangular clear eyeglasses',
  'a faint short scar through one eyebrow', 'a pronounced cupid’s bow and a fuller lower lip',
  'a soft cleft chin', 'slightly prominent ears partly visible through the hair',
]

const localIdentityMarkers = [
  'shallow chin dimple', 'strong cheek dimple', 'small left-cheek beauty mark',
  'strong nose freckles', 'slightly rotated front tooth', 'clear rectangular glasses',
  'short eyebrow scar', 'fuller lower lip', 'soft cleft chin', 'slightly prominent ears',
]

const localAsymmetryTraits = [
  'left brow slightly higher', 'right brow slightly higher',
  'left eye subtly narrower', 'right eye subtly narrower',
  'nose tip subtly angled left', 'nose tip subtly angled right',
  'left cheek slightly fuller', 'right cheek slightly fuller',
  'left jaw corner slightly broader', 'right jaw corner slightly broader',
  'slightly uneven smile corners', 'mildly uneven eyelid folds',
  'slightly off-center chin', 'subtle uneven temple width',
  'one ear set slightly higher', 'slightly uneven nostril shape',
  'natural left-right facial asymmetry',
]

const blackComplexionTraits = [
  'medium-deep warm brown skin with natural tone variation',
  'deep neutral brown skin with soft under-eye texture',
  'rich dark brown skin with a subtle cheek highlight',
  'medium brown skin with a few small blemishes',
  'deep warm brown skin with realistic uneven sun exposure',
  'dark neutral brown skin with visible pores and natural lip texture',
]

const localBlackComplexionTraits = [
  'medium-deep warm brown skin', 'deep neutral brown skin',
  'rich dark brown skin', 'medium brown skin',
  'deep warm brown skin', 'dark neutral brown skin',
]

const femaleHair = [
  'shoulder-length light brown hair', 'dark blonde hair in a loose ponytail',
  'wavy medium-brown hair', 'straight auburn hair', 'short sandy-blonde bob',
  'long chestnut hair with flyaways', 'dark brown chin-length hair',
  'strawberry-blonde shoulder-length hair', 'light brown hair in a messy bun',
  'soft blonde waves', 'medium brown layered hair', 'short auburn pixie cut',
]

const blackFemaleHair = [
  'natural shoulder-length curls', 'short defined coils', 'a loose curly high puff',
  'medium box braids pulled loosely back', 'a rounded natural afro',
  'long natural curls with a few flyaways', 'a chin-length textured bob',
  'soft twists gathered behind the shoulders',
]

const maleHair = [
  'short medium-brown hair', 'slightly tousled dark-blonde hair', 'short auburn hair',
  'curly light-brown hair', 'short sandy-blonde hair', 'receding brown hair',
  'short dark-brown hair with a few gray strands', 'wavy chestnut hair',
  'close-cropped light-brown hair', 'messy reddish-brown hair',
  'medium-length dirty-blonde hair', 'short brown hair and light stubble',
]

const blackMaleHair = [
  'short natural curls', 'a neat low fade with natural texture',
  'close-cropped coily hair', 'short twists with tapered sides',
  'a small rounded natural afro', 'short natural hair with light stubble',
]

const maleFaceDetails = [
  'broad neck and beard shadow',
  'strong jaw and short stubble',
  'angular cheeks and beard shadow',
  'clean-shaven face and broad neck',
  'short beard and strong jaw',
  'sideburns and light stubble',
]

const femaleClothes = [
  'a plain crew-neck sweater', 'a simple cotton T-shirt', 'an unbranded denim shirt',
  'a casual cardigan over a plain top', 'a solid-color hoodie', 'a simple knit pullover',
  'a plain button-front blouse', 'an unbranded canvas jacket', 'a casual henley shirt',
  'a soft flannel overshirt',
]

const attractiveFemaleClothes = [
  'a fitted ribbed crew-neck top', 'a tasteful wrap blouse',
  'a fitted V-neck cotton T-shirt', 'a soft off-shoulder casual sweater',
  'a sleeveless high-neck knit top', 'a fitted long-sleeve henley top',
]

const maleClothes = [
  'a plain crew-neck T-shirt', 'an unbranded flannel shirt', 'a simple knit sweater',
  'a casual henley shirt', 'a solid-color hoodie', 'an unbranded canvas jacket',
  'a plain button-down shirt', 'a casual zip-up sweatshirt', 'a simple denim shirt',
  'a lightweight utility overshirt',
]

const colors = ['navy', 'charcoal', 'forest green', 'rust', 'cream', 'slate blue', 'burgundy', 'tan', 'muted teal', 'heather gray']

// 女性头像以年轻成年人为主，同时保留少量较成熟年龄以覆盖 18–45 岁筛选场景。
// 每 20 张：16 张 20–32 岁、3 张 33–38 岁、1 张 39–45 岁。
const femaleAgePattern = [
  22, 24, 26, 28, 23, 25, 27, 29,
  21, 30, 24, 26, 28, 31, 32, 20,
  34, 36, 38, 42,
]

function hashNumber(value) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function pick(values, id, salt) {
  return values[hashNumber(`${id}:${salt}`) % values.length]
}

function createIdentitySpecification(index, gender, blackPresenting, planSalt = '') {
  // 每个维度独立散列，避免混合进制的高位特征在连续编号中长时间不变
  //（例如一整组人物连续戴同类眼镜），从而让模型更容易生成可区分身份。
  const identityKey = `${gender}:${index}:${blackPresenting ? 'black' : 'white'}:${planSalt}`
  return [
    pick(faceShapes, identityKey, 'face-shape'),
    pick(eyeTraits, identityKey, 'eyes'),
    pick(noseTraits, identityKey, 'nose'),
    pick(browTraits, identityKey, 'brows'),
    pick(lipAndChinTraits, identityKey, 'lips-chin'),
    pick(cheekAndForeheadTraits, identityKey, 'cheeks-forehead'),
    pick(blackPresenting ? blackComplexionTraits : complexionTraits, identityKey, 'complexion'),
    pick(identityMarkers, identityKey, 'marker'),
  ]
}

function variant(index, gender, planSalt = '') {
  const i = index - 1
  const id = `${gender === 'female' ? 'f' : 'm'}-${String(index).padStart(3, '0')}`
  const promptKey = planSalt ? `${id}:${planSalt}` : id
  const age = gender === 'female'
    ? femaleAgePattern[i % femaleAgePattern.length]
    : 18 + ((i * 11 + 17) % 28)
  const blackPresenting = i % 7 === 6
  const hairPool = gender === 'female'
    ? (blackPresenting ? blackFemaleHair : femaleHair)
    : (blackPresenting ? blackMaleHair : maleHair)
  let hair = pick(hairPool, promptKey, 'hair')
  const attractiveFemale = gender === 'female' && age >= 21
  const clothes = attractiveFemale
    ? pick(attractiveFemaleClothes, promptKey, 'clothes-attractive')
    : pick(gender === 'female' ? femaleClothes : maleClothes, promptKey, 'clothes-everyday')
  const color = pick(colors, promptKey, 'color')
  const scene = pick(settings, promptKey, 'scene')
  const localScene = pick(localSettings, promptKey, 'local-scene')
  const outdoors = /porch|sidewalk|backyard|park|entrance|doorway|bus stop|market/.test(scene)
  const lights = outdoors ? outdoorLight : indoorLight
  const illumination = pick(lights, promptKey, 'light')
  const expression = pick(expressions, promptKey, 'expression')
  const crop = pick(framing, promptKey, 'framing')
  const cameraChoice = hashNumber(`${promptKey}:camera`) % 3
  const camera = cameraChoice === 0
    ? 'an ordinary recent smartphone front camera with no beauty filter'
    : cameraChoice === 1
      ? 'an ordinary smartphone rear camera held casually by a friend'
      : 'a modest older smartphone camera with natural snapshot character'
  const captureChoice = hashNumber(`${promptKey}:capture`) % 4
  const captureArtifact = captureChoice === 0
    ? 'mild sensor noise in the shadows and slightly compressed fine detail'
    : captureChoice === 1
      ? 'subtle hand-held softness and a small white-balance shift'
      : captureChoice === 2
        ? 'ordinary phone sharpening, modest dynamic range, and imperfect exposure on hair'
        : 'a tiny amount of motion softness and natural JPEG-like texture'
  const detailChoice = hashNumber(`${promptKey}:detail`) % 4
  const detail = detailChoice === 0
    ? 'a few natural freckles, mild under-eye texture, and faint redness around the nostrils'
    : detailChoice === 1
      ? 'subtle smile lines, natural pores, peach fuzz, and mild cheek color variation'
      : detailChoice === 2
        ? 'minor skin variation, a small blemish, natural lip lines, and a few flyaway hairs'
        : 'visible pores, slight facial asymmetry, realistic fine lines, and uneven sun tone'
  let identityParts = createIdentitySpecification(index, gender, blackPresenting, planSalt)

  // 首批样片人工复核发现 f-005 与 f-001 过于相似，固定一组差异更大的身份特征。
  if (!planSalt && gender === 'female' && index === 5) {
    hair = 'shoulder-length very dark brown tight curls'
    identityParts = [
      'a broad square face with a strong jaw',
      'deep-set dark brown eyes with close spacing',
      'a prominent aquiline nose',
      'thick straight brows',
      'light olive skin with strong freckles across the nose',
      'slightly prominent ears partly visible through the hair',
    ]
  }
  // f-006 在本地模型中连续收敛到与 f-002 近似的浅发模板，固定为强差异身份。
  if (!planSalt && gender === 'female' && index === 6) {
    hair = 'short very dark brown pixie cut'
    identityParts = [
      faceShapes[1],
      eyeTraits[3],
      noseTraits[3],
      browTraits[1],
      lipAndChinTraits[3],
      cheekAndForeheadTraits[0],
      complexionTraits[3],
      identityMarkers[3],
    ]
  }
  const identity = identityParts.join(', ')
  const raceLabel = blackPresenting ? 'Black-presenting' : 'white-presenting'
  const subjectLabel = `${raceLabel} American ${gender === 'female' ? 'woman' : 'man'}, age ${age}`
  const localSubjectLabel = `${age}-year-old ${blackPresenting ? 'Black' : 'white'} American ${gender === 'female' ? 'woman' : 'man'}`
  const localIdentity = !planSalt && gender === 'female' && index === 5
    ? 'broad square face, close-set dark brown eyes, aquiline nose, freckled light olive skin'
    : [
        localFaceShapes[faceShapes.indexOf(identityParts[0])],
        localEyeTraits[eyeTraits.indexOf(identityParts[1])],
        localNoseTraits[noseTraits.indexOf(identityParts[2])],
        (blackPresenting ? localBlackComplexionTraits : localComplexionTraits)[
          (blackPresenting ? blackComplexionTraits : complexionTraits).indexOf(identityParts[6])
        ],
      ].join(', ')
  const localMarker = !planSalt && gender === 'female' && index === 5
    ? 'slightly prominent ears'
    : localIdentityMarkers[identityMarkers.indexOf(identityParts[7])]
  const localAsymmetry = localAsymmetryTraits[(i + hashNumber(planSalt)) % localAsymmetryTraits.length]
  const compactIdentity = `${localIdentity}, ${localMarker}, ${localAsymmetry}`
  const localOpening = `Unretouched phone photo of ${localSubjectLabel} in ${localScene}.`
  const localPrompt = [
    localOpening,
    gender === 'male'
      ? `${compactIdentity}; ${hair}; T-shirt.`
      : `${compactIdentity}; ${hair}; ${color} T-shirt.`,
  ].join(' ')
  const localNegativePrompt = [
    gender === 'male' ? 'woman, female, girl, feminine, lipstick, breasts, long feminine hair' : 'man, male, boy, beard',
    age <= 29 ? 'child, teenager, minor, middle-aged, elderly' : 'child, teenager, minor, elderly, senior',
    'multiple people, collage, text, logo, watermark',
    'waxy skin, glass eyes, beauty filter, studio portrait, retouched skin, heavy makeup',
    'drawing, deformed face',
    localMarker.includes('glasses') ? '' : 'eyeglasses, glasses',
  ].filter(Boolean).join(', ')

  return {
    id,
    gender,
    age,
    prompt: [
      `Square photorealistic candid profile portrait of a fictional ${subjectLabel}.`,
      `Distinct identity specification: ${identity}. Do not reuse a generic face or influencer look; these structural traits must be clearly visible.`,
      `${hair}, wearing ${clothes} in ${color}, in ${scene}.`,
      `${attractiveFemale ? 'minimal natural makeup, a confident but unperformed half-smile' : expression}, ${crop}, ${pick(cameraAngles, promptKey, 'angle')}, looking naturally toward the camera; shoulders and eyebrows are not perfectly level. Naturally attractive and photogenic in an individual way, but still a believable unretouched person rather than a standardized beauty face or polished model.`,
      `Captured with ${camera}, ${illumination}, realistic exposure, ordinary color balance, ${captureArtifact}.`,
      `Show ${detail}. Natural semi-matte skin: forehead and cheeks have soft diffuse reflection, the nose bridge has only a narrow restrained highlight, never a continuous glossy band across the face.`,
      'Background must feel lived-in and ordinary, remain partly readable, and have normal phone-camera depth instead of creamy portrait-mode bokeh.',
      'Deliver a full-bleed rectangular square photograph. Do not draw a circle, oval, mask, cutout, border, vignette, or white frame. Leave ordinary headroom so the app can apply its own circular crop later.',
      attractiveFemale ? 'Tastefully and subtly sexy in an ordinary social-profile way, fully clothed, non-explicit, no lingerie, no cleavage emphasis, no provocative pose.' : '',
      'This is a unique fictional adult and must not resemble any real or public person.',
      'No text, no logo, no brand, no flag, no uniform, no badge, no credential, no visible watermark.',
      'Avoid studio lighting, beauty retouching, a reusable stock face, influencer-face proportions, fashion photography, plastic or waxy skin, glossy oil-film skin, perfect symmetry, identical eye catchlights, unnaturally perfect teeth, HDR, glamour posing, cinematic grading, illustration, 3D render, circular framing, and obvious AI aesthetics.',
    ].filter(Boolean).join(' '),
    localPrompt,
    localNegativePrompt,
    seed: hashNumber(`${promptKey}:seed`),
  }
}

export function createPortraitPlan(planSalt = '') {
  const plan = []
  for (let index = 1; index <= 420; index += 1) plan.push(variant(index, 'female', planSalt))
  for (let index = 1; index <= 180; index += 1) plan.push(variant(index, 'male', planSalt))
  return plan.sort((a, b) => a.id.localeCompare(b.id))
}

if (process.argv[1]?.endsWith('portrait-plan.mjs')) {
  const start = Math.max(0, Number(process.argv[2] || 0))
  const count = Math.max(1, Number(process.argv[3] || 600))
  const planSalt = process.argv[4] || ''
  console.log(JSON.stringify(createPortraitPlan(planSalt).slice(start, start + count)))
}
