/**
 * Project-specific artwork. These are conceptual diagrams, deliberately NOT
 * product screenshots, live data, verified measurements, or UI replicas.
 */
export function ProjectVisual({ slug }: { slug: string }) {
  if (slug === "ai-vs-real") {
    return (
      <svg viewBox="0 0 560 315" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <defs>
          <pattern id="aiTex" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M0 20V0H20" stroke="#6d637a" strokeWidth=".6" opacity=".23" fill="none"/>
          </pattern>
          <linearGradient id="aiLeft" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#d9a7a3"/><stop offset="1" stopColor="#907991"/></linearGradient>
          <linearGradient id="aiRight" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#a9b9b1"/><stop offset="1" stopColor="#758a98"/></linearGradient>
        </defs>
        <g transform="translate(70 20) rotate(-7 190 140)">
          <rect x="0" y="0" width="360" height="252" rx="18" fill="#f8f1e9" stroke="#655c6d" strokeOpacity=".23"/>
          <path d="M180 0v252" stroke="#f9f3eb" strokeWidth="9"/>
          <rect x="13" y="14" width="161" height="218" rx="8" fill="url(#aiLeft)"/>
          <rect x="186" y="14" width="161" height="218" rx="8" fill="url(#aiRight)"/>
          <circle cx="95" cy="107" r="52" fill="#efc9af"/>
          <path d="M35 223q65-99 130-27v26z" fill="#74627b"/>
          <path d="M56 104q-5-55 40-56 43 0 51 40l-10 9q-26-23-58-19-7 23-23 26" fill="#54445d"/>
          <circle cx="270" cy="98" r="49" fill="#d9d2c6" opacity=".9"/>
          <path d="m193 219 64-81 40 32 50-63v112z" fill="#687d82"/>
          <rect x="186" y="14" width="161" height="218" fill="url(#aiTex)" opacity=".9"/>
          <path d="M41 207h106" stroke="#f8f4e8" strokeWidth="1.5" strokeDasharray="6 5" opacity=".7"/>
          <circle cx="183" cy="128" r="55" fill="none" stroke="#fff9ee" strokeWidth="9"/>
          <path d="m224 173 55 55" stroke="#fff9ee" strokeWidth="13" strokeLinecap="round"/>
          <circle cx="183" cy="128" r="44" fill="none" stroke="#413748" strokeWidth="1.7" strokeDasharray="7 4"/>
          <path d="M171 128h25m-12-12v25" stroke="#413748" strokeWidth="2" strokeLinecap="round"/>
        </g>
        <g transform="translate(384 22)">
          <rect width="132" height="54" rx="10" fill="#f9f5ef" stroke="#8c798e" strokeOpacity=".38"/>
          <circle cx="22" cy="27" r="6" fill="#806786"/>
          <path d="M38 22h66m-66 10h46" stroke="#8a8490" strokeWidth="4" strokeLinecap="round" opacity=".65"/>
        </g>
        <path d="m427 78-18 23" stroke="#6b586f" strokeWidth="1.5" strokeDasharray="4 6"/>
      </svg>
    );
  }
  if (slug === "zenith") {
    return (
      <svg viewBox="0 0 560 315" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="solarPanel" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#3c6374"/><stop offset="1" stopColor="#253f56"/></linearGradient>
        </defs>
        <circle cx="427" cy="76" r="43" fill="#f8dc88"/>
        <circle cx="427" cy="76" r="65" fill="none" stroke="#eacb73" strokeWidth="1.5" strokeDasharray="4 8"/>
        <path d="m427 0v12m0 129v15m-76-80h-14m179 0h-13m-131-52-11-10m144 116-12-10" stroke="#c2a366" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="m84 177 212-119 160 102-212 122z" fill="#c0b2a6" stroke="#91877e" strokeWidth="2"/>
        <path d="m83 177 161 105v24L83 205z" fill="#b59f8e"/>
        <path d="m244 282 212-122v24L244 306z" fill="#867e79"/>
        <g transform="translate(111 162) rotate(-30)">
          <rect x="0" y="0" width="220" height="115" rx="4" fill="#dfd8ce" stroke="#a8a39f" strokeWidth="7"/>
          {Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>
            <rect key={`${r}-${c}`} x={c*26+4} y={r*26+4} width="23" height="23" rx="1" fill="url(#solarPanel)" stroke="#86a1a4" strokeWidth=".7"/>))}
          <path d="M106 0v114M0 59h219" stroke="#d3d7d0" strokeWidth="2" opacity=".8"/>
        </g>
        <path d="M55 265c47 18 75 17 123 1m137-11c40 18 75 11 108-10" stroke="#94a398" strokeWidth="2" fill="none" strokeDasharray="6 10"/>
        <rect x="33" y="40" width="121" height="57" rx="13" fill="#faf6e9" stroke="#c7c0ae"/>
        <circle cx="55" cy="67" r="11" fill="#dfc57b"/>
        <path d="M79 62h56m-56 13h40" stroke="#8a8c83" strokeWidth="5" strokeLinecap="round" opacity=".63"/>
      </svg>
    );
  }
  if (slug === "helios") {
    return (
      <svg viewBox="0 0 560 315" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <defs>
          <pattern id="energyGrid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" stroke="#b3d5d0" strokeOpacity=".12" fill="none"/></pattern>
          <linearGradient id="energyChart" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#99e7ce" stopOpacity=".23"/><stop offset="1" stopColor="#99e7ce" stopOpacity="0"/></linearGradient>
        </defs>
        <g transform="translate(48 24) rotate(-4 240 130)">
          <rect width="460" height="260" rx="20" fill="#263744" stroke="#789ba6" strokeWidth="2"/>
          <rect x="0" y="0" width="460" height="260" fill="url(#energyGrid)" rx="20"/>
          <path d="M0 46h460" stroke="#45606a" strokeWidth="2"/>
          <circle cx="26" cy="23" r="6" fill="#e5a98d"/>
          <circle cx="48" cy="23" r="6" fill="#dfca8e"/>
          <circle cx="70" cy="23" r="6" fill="#8fc1ab"/>
          <path d="M307 23h108" stroke="#8aa3a7" strokeWidth="4" strokeLinecap="round" opacity=".6"/>
          <path d="M25 77h85M25 93h60" stroke="#b9c2bb" strokeWidth="5" strokeLinecap="round" opacity=".65"/>
          <path d="M24 203 62 187l26 19 34-84 26 66 31-37 24 19 27-52 27 21 33-20 19 24 22-10 38 24 24-22" fill="none" stroke="#a8eccf" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
          <path d="M24 203 62 187l26 19 34-84 26 66 31-37 24 19 27-52 27 21 33-20 19 24 22-10 38 24 24-22v75H24z" fill="url(#energyChart)"/>
          <circle cx="122" cy="122" r="8" fill="#f7d7ad" stroke="#a8eccf" strokeWidth="3"/>
          <path d="M122 119V77" stroke="#e4bca1" strokeWidth="1.5" strokeDasharray="3 5"/>
          <rect x="303" y="66" width="128" height="49" rx="7" fill="#385261" stroke="#628a90"/>
          <path d="M321 84h87m-87 14h56" stroke="#c8d8c8" strokeWidth="4" strokeLinecap="round" opacity=".7"/>
          <path d="M25 235h120m23 0h76m28 0h73" stroke="#9cbbb2" strokeWidth="5" opacity=".47" strokeLinecap="round"/>
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 560 315" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <defs><linearGradient id="talkGlass" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#f7f0ee"/><stop offset="1" stopColor="#dfd8e9"/></linearGradient></defs>
      <g transform="translate(95 12) rotate(-6 175 140)">
        <rect width="355" height="275" rx="22" fill="url(#talkGlass)" stroke="#a59bab" strokeWidth="2"/>
        <rect x="0" y="0" width="355" height="49" rx="22" fill="#49415b"/>
        <path d="M0 37h355v15H0z" fill="#49415b"/>
        <circle cx="29" cy="25" r="11" fill="#afa2c7"/>
        <path d="M52 22h97m-97 9h69" stroke="#f0e7e9" strokeWidth="5" strokeLinecap="round" opacity=".68"/>
        <circle cx="37" cy="84" r="15" fill="#c7aa9c"/>
        <path d="M70 79h126m-126 11h76" stroke="#8a8293" strokeWidth="6" strokeLinecap="round" opacity=".6"/>
        <rect x="72" y="124" width="207" height="40" rx="17" fill="#dad0e2"/>
        <path d="M94 141h152m-152 10h96" stroke="#9285a1" strokeWidth="5" strokeLinecap="round" opacity=".64"/>
        <rect x="111" y="178" width="216" height="48" rx="17" fill="#544b69"/>
        <path d="M130 196h155m-155 12h105" stroke="#ece5f0" strokeWidth="5" strokeLinecap="round" opacity=".73"/>
        <rect x="26" y="239" width="300" height="19" rx="9.5" fill="#e9e3e8" stroke="#c8c0cc"/>
      </g>
      <circle cx="447" cy="54" r="39" fill="#c2b6d5" opacity=".6"/>
      <path d="M427 46q21-24 43 0m-39 14q18 14 35 0" fill="none" stroke="#766a8b" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="75" cy="234" r="30" fill="#e9c8b9" opacity=".78"/>
      <path d="m59 235 11 9 21-23" stroke="#956c88" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
