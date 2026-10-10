/**
 * Editorial illustration of the studio concept.
 * This is artwork, not a claimed screenshot or a portrait of the owner.
 * The real interactive room loads only after the visitor chooses to enter.
 */
export function StudioSceneIllustration() {
  return (
    <svg viewBox="0 0 580 600" className="studio-scene-illustration" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sceneWall" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#eee9e2"/>
          <stop offset="58%" stopColor="#e0dfe6"/>
          <stop offset="100%" stopColor="#c7d4d0"/>
        </linearGradient>
        <linearGradient id="sceneFloor" x1="0" x2=".7" y1="0" y2="1">
          <stop offset="0%" stopColor="#ccc1bb"/><stop offset="100%" stopColor="#b7a7a3"/>
        </linearGradient>
        <linearGradient id="sceneScreen" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#34364d"/><stop offset="100%" stopColor="#171d2a"/>
        </linearGradient>
        <linearGradient id="sceneShirt" x1="0" x2="1">
          <stop offset="0%" stopColor="#5b5065"/><stop offset="100%" stopColor="#2b293c"/>
        </linearGradient>
        <linearGradient id="sceneLight" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff9dc" stopOpacity=".9"/><stop offset="100%" stopColor="#ffd29a" stopOpacity="0"/>
        </linearGradient>
        <clipPath id="sceneFrame"><rect width="580" height="600" rx="38"/></clipPath>
        <filter id="sceneBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
        <filter id="sceneShadow" x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="0" dy="11" stdDeviation="13" floodColor="#4b405f" floodOpacity=".19"/></filter>
        <pattern id="sceneGrain" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".43" fill="#706c7c" opacity=".2"/></pattern>
      </defs>
      <g clipPath="url(#sceneFrame)">
        <path fill="url(#sceneWall)" d="M0 0H580V600H0z"/>
        <circle cx="465" cy="130" r="165" fill="#ece4cf" opacity=".5" filter="url(#sceneBlur)"/>
        <path d="M0 424 580 380V600H0z" fill="url(#sceneFloor)"/>
        <path d="m0 426 580-46" stroke="#a8a1a7" strokeWidth="3" opacity=".55"/>
        <path d="M0 0v425l580-45V0" fill="url(#sceneGrain)" opacity=".25"/>

        {/* Window, the outside world, and its warm light spill */}
        <g filter="url(#sceneShadow)">
          <rect x="335" y="65" width="188" height="243" rx="92" fill="#faf7ed"/>
          <rect x="347" y="77" width="164" height="219" rx="82" fill="#b7d4d4"/>
          <path d="M347 219q82-62 164-18v95H347z" fill="#99b3ab"/>
          <path d="M347 248q50-28 91 3 43-45 73-27v72H347z" fill="#85a99a"/>
          <circle cx="453" cy="145" r="33" fill="#fff2cb"/>
          <path d="M429 82v210" stroke="#faf7ed" strokeWidth="8"/>
          <path d="M349 185h161" stroke="#faf7ed" strokeWidth="8"/>
          <rect x="337" y="303" width="187" height="11" rx="5" fill="#f5efe7"/>
        </g>
        <path d="m345 315 152-2 81 243H246z" fill="url(#sceneLight)" opacity=".7"/>

        {/* Wall frames and shelf, quietly referencing a lived-in workspace */}
        <rect x="58" y="114" width="89" height="122" rx="8" fill="#f6f1ec" stroke="#a9a6a7" strokeWidth="4"/>
        <rect x="72" y="129" width="61" height="94" rx="2" fill="#d9d2d9"/>
        <circle cx="100" cy="166" r="18" fill="#afa4c3"/>
        <path d="m72 210 28-29 22 19 11-13v36H72z" fill="#8c9e94"/>
        <path d="M189 118h94" stroke="#827987" strokeWidth="7" strokeLinecap="round"/>
        <rect x="204" y="89" width="17" height="29" rx="3" fill="#c0a99f"/>
        <rect x="228" y="75" width="16" height="43" rx="3" fill="#949aa5"/>
        <rect x="252" y="96" width="19" height="22" rx="3" fill="#968ba6"/>
        <path d="M197 118q-6-30-17-26 14-17 24 8 4-18 13-17" stroke="#718d77" strokeWidth="4" strokeLinecap="round" fill="none"/>

        {/* Floating pendant light */}
        <path d="M289 0v57" stroke="#756e7d" strokeWidth="4"/>
        <path d="M254 76q35-52 70 0v13h-70z" fill="#474150"/>
        <ellipse cx="289" cy="91" rx="37" ry="5" fill="#f5d9a8"/>
        <path d="M251 92 199 295h182L326 92z" fill="url(#sceneLight)" opacity=".32"/>

        {/* Floor rug */}
        <ellipse cx="293" cy="532" rx="254" ry="52" fill="#8c8b92" opacity=".14"/>
        <path d="m75 503 288-41 153 81-290 49z" fill="#ded9cb" opacity=".94"/>
        <path d="m104 505 261-35 126 71-266 43z" fill="none" stroke="#c4b4ac" strokeWidth="2" strokeDasharray="5 9"/>

        {/* Isometric desk with legs */}
        <path d="m116 368 250-42 101 37-258 48z" fill="#806b6a" filter="url(#sceneShadow)"/>
        <path d="m116 369 93 42 258-48v20l-258 48-93-42z" fill="#ab8c7e"/>
        <path d="m209 431 10-2v135l-11-3z" fill="#69565d"/>
        <path d="m425 390 9-3v136l-9 4z" fill="#6a585c"/>
        <path d="m127 390 9 3v111l-9 4z" fill="#726067"/>

        {/* Desktop monitor and rendered code workspace */}
        <g transform="translate(168 215)" filter="url(#sceneShadow)">
          <path d="m0 0 176-21 8 128-176 26z" fill="#31303f"/>
          <path d="m10 11 156-18 6 102-155 22z" fill="url(#sceneScreen)"/>
          <path d="m21 24 37-4" stroke="#c5b2e4" strokeWidth="4" strokeLinecap="round"/>
          <path d="m21 37 63-7" stroke="#92aab3" strokeWidth="3" strokeLinecap="round"/>
          <path d="m35 50 90-10" stroke="#75c8b0" strokeWidth="3" strokeLinecap="round"/>
          <path d="m35 63 66-8" stroke="#caa9ba" strokeWidth="3" strokeLinecap="round"/>
          <path d="m21 78 124-16" stroke="#a4b7ce" strokeWidth="3" strokeLinecap="round"/>
          <path d="m21 92 93-11" stroke="#9da99b" strokeWidth="3" strokeLinecap="round"/>
          <path d="m74 122 10 28 31-5-8-28z" fill="#545261"/>
          <path d="m52 150 86-11 10 9-92 13z" fill="#77727b"/>
        </g>
        {/* A coffee cup and keyboard */}
        <path d="m188 385 102-17 28 12-110 20z" fill="#4c4656"/>
        {Array.from({length:7},(_,i)=><path key={i} d={`M${199+i*13} ${388-i*2.2}l25 4`} stroke="#aaa1ad" opacity=".7" strokeWidth="2"/>)}
        <ellipse cx="390" cy="360" rx="14" ry="6" fill="#e6d9c8"/>
        <path d="m378 358 3 23q12 10 23-3l2-21" fill="#dfd2bf"/>
        <path d="m404 364q16-6 11 8-3 6-10 4" stroke="#dfd2bf" fill="none" strokeWidth="5"/>

        {/* Seated resident: illustrative figure, not a photographic likeness */}
        <g filter="url(#sceneShadow)">
          <path d="M336 482q24-39 74-48 44 29 22 92l-71 10z" fill="#575260"/>
          <path d="M367 516 351 571l19 9 47-51z" fill="#383744"/>
          <path d="m412 527 63 35-9 18-82-21z" fill="#44424d"/>
          <path d="M300 377q27-26 72-14 52 21 54 84l-62 60-54-32q-31-58-10-98z" fill="url(#sceneShirt)"/>
          <path d="M332 370q37 24 49 68" fill="none" stroke="#766a80" strokeWidth="6"/>
          <path d="m321 421-55-24-12 17 73 46z" fill="#464052"/>
          <path d="m261 397-22-5-10 11 25 11z" fill="#b89688"/>
          <path d="M371 424 325 390l-14 18 58 52z" fill="#474051"/>
          <path d="m322 390-18-13-11 13 18 20z" fill="#b68d82"/>
          <path d="m333 327-18 24 8 33 28 9 25-23-2-27z" fill="#c5a08e"/>
          <path d="M312 342q-6-37 28-45 40-9 51 26-4 17-16 23l-8-21q-22 12-53 9z" fill="#33313c"/>
          <path d="M315 332q20-15 52-17" fill="none" stroke="#514a58" strokeWidth="7" strokeLinecap="round"/>
          <path d="m340 389 8 16 18-17" fill="#dac2a8"/>
        </g>
        {/* Plant, lamp and little ambient details */}
        <path d="M73 447q-6-55 4-90m0 90q-29-34-28-55m28 55q28-41 26-67" stroke="#658577" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M73 404q-38-32-40-13 8 23 40 26M80 383q39-24 35-4-10 23-35 28M75 360q-28-30-30-9 7 21 30 22" fill="#809e87"/>
        <path d="m54 437 46-3-9 48-30 3z" fill="#d0aaa2"/>
        <path d="m54 437 46-3-3 10-40 4z" fill="#e2bcb1"/>
        <g opacity=".64">
          <path d="M50 541h91" stroke="#e2d8ce" strokeWidth="3"/>
          <path d="M453 479h56" stroke="#e6dcd3" strokeWidth="3"/>
        </g>
        <rect width="580" height="600" fill="url(#sceneGrain)" opacity=".1"/>
      </g>
    </svg>
  );
}
