/* ===========================================================
   Good Habits — flag data for the time-zone "flag wave".
   Maps an IANA time zone -> ISO country, and a country -> a
   compact flag spec rendered in real colors on the star grid.
   Exposes: window.GoodHabitsFlags = { tzCountry, flagColorAt, specForCountry }
   =========================================================== */
(function () {
  "use strict";

  // ---- common flag colors ----
  const W = "#ffffff", K = "#111111";

  // ---- IANA time zone -> ISO 3166-1 alpha-2 country ----
  // Grouped by country for readability, then flattened. Includes a few legacy
  // aliases (Calcutta/Saigon/Kiev/…) so older ICU names resolve too.
  const G = {
    US: ["America/New_York", "America/Detroit", "America/Kentucky/Louisville", "America/Kentucky/Monticello", "America/Indiana/Indianapolis", "America/Indiana/Vincennes", "America/Indiana/Winamac", "America/Indiana/Marengo", "America/Indiana/Petersburg", "America/Indiana/Vevay", "America/Indiana/Tell_City", "America/Indiana/Knox", "America/Chicago", "America/Menominee", "America/North_Dakota/Center", "America/North_Dakota/New_Salem", "America/North_Dakota/Beulah", "America/Denver", "America/Boise", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "America/Juneau", "America/Sitka", "America/Metlakatla", "America/Yakutat", "America/Nome", "America/Adak", "Pacific/Honolulu"],
    CA: ["America/St_Johns", "America/Halifax", "America/Glace_Bay", "America/Moncton", "America/Goose_Bay", "America/Toronto", "America/Montreal", "America/Nipigon", "America/Thunder_Bay", "America/Iqaluit", "America/Pangnirtung", "America/Atikokan", "America/Winnipeg", "America/Rainy_River", "America/Resolute", "America/Rankin_Inlet", "America/Regina", "America/Swift_Current", "America/Edmonton", "America/Cambridge_Bay", "America/Yellowknife", "America/Inuvik", "America/Creston", "America/Dawson_Creek", "America/Fort_Nelson", "America/Vancouver", "America/Whitehorse", "America/Dawson", "America/Blanc-Sablon"],
    MX: ["America/Mexico_City", "America/Cancun", "America/Merida", "America/Monterrey", "America/Matamoros", "America/Mazatlan", "America/Chihuahua", "America/Ojinaga", "America/Ciudad_Juarez", "America/Hermosillo", "America/Tijuana", "America/Bahia_Banderas"],
    GT: ["America/Guatemala"], BZ: ["America/Belize"], SV: ["America/El_Salvador"], HN: ["America/Tegucigalpa"], NI: ["America/Managua"], CR: ["America/Costa_Rica"], PA: ["America/Panama"],
    CU: ["America/Havana"], JM: ["America/Jamaica"], HT: ["America/Port-au-Prince"], DO: ["America/Santo_Domingo"], BS: ["America/Nassau"], PR: ["America/Puerto_Rico"], TT: ["America/Port_of_Spain"], BB: ["America/Barbados"],
    CO: ["America/Bogota"], VE: ["America/Caracas"], EC: ["America/Guayaquil", "Pacific/Galapagos"], PE: ["America/Lima"], BO: ["America/La_Paz"], CL: ["America/Santiago", "America/Punta_Arenas", "Pacific/Easter"], PY: ["America/Asuncion"], UY: ["America/Montevideo"],
    BR: ["America/Sao_Paulo", "America/Bahia", "America/Fortaleza", "America/Recife", "America/Belem", "America/Maceio", "America/Manaus", "America/Cuiaba", "America/Campo_Grande", "America/Porto_Velho", "America/Boa_Vista", "America/Rio_Branco", "America/Noronha", "America/Araguaina", "America/Santarem"],
    AR: ["America/Argentina/Buenos_Aires", "America/Argentina/Cordoba", "America/Argentina/Salta", "America/Argentina/Tucuman", "America/Argentina/Mendoza", "America/Argentina/Catamarca", "America/Argentina/La_Rioja", "America/Argentina/San_Juan", "America/Argentina/San_Luis", "America/Argentina/Jujuy", "America/Argentina/Rio_Gallegos", "America/Argentina/Ushuaia"],
    GB: ["Europe/London"], IE: ["Europe/Dublin"], PT: ["Europe/Lisbon", "Atlantic/Azores", "Atlantic/Madeira"], FR: ["Europe/Paris"], ES: ["Europe/Madrid", "Africa/Ceuta", "Atlantic/Canary"], IT: ["Europe/Rome"], BE: ["Europe/Brussels"], NL: ["Europe/Amsterdam"], LU: ["Europe/Luxembourg"], DE: ["Europe/Berlin", "Europe/Busingen"], CH: ["Europe/Zurich"], AT: ["Europe/Vienna"],
    PL: ["Europe/Warsaw"], CZ: ["Europe/Prague"], SK: ["Europe/Bratislava"], SI: ["Europe/Ljubljana"], HR: ["Europe/Zagreb"], RS: ["Europe/Belgrade"], BA: ["Europe/Sarajevo"], ME: ["Europe/Podgorica"], MK: ["Europe/Skopje"], AL: ["Europe/Tirane"], HU: ["Europe/Budapest"], RO: ["Europe/Bucharest"], BG: ["Europe/Sofia"], GR: ["Europe/Athens"], MT: ["Europe/Malta"], CY: ["Asia/Nicosia", "Europe/Nicosia", "Asia/Famagusta"],
    DK: ["Europe/Copenhagen"], SE: ["Europe/Stockholm"], NO: ["Europe/Oslo"], FI: ["Europe/Helsinki"], IS: ["Atlantic/Reykjavik"],
    RU: ["Europe/Moscow", "Europe/Kaliningrad", "Europe/Samara", "Europe/Volgograd", "Europe/Saratov", "Europe/Astrakhan", "Europe/Ulyanovsk", "Europe/Kirov", "Asia/Yekaterinburg", "Asia/Omsk", "Asia/Novosibirsk", "Asia/Barnaul", "Asia/Tomsk", "Asia/Novokuznetsk", "Asia/Krasnoyarsk", "Asia/Irkutsk", "Asia/Chita", "Asia/Yakutsk", "Asia/Khandyga", "Asia/Vladivostok", "Asia/Ust-Nera", "Asia/Magadan", "Asia/Sakhalin", "Asia/Srednekolymsk", "Asia/Kamchatka", "Asia/Anadyr"],
    UA: ["Europe/Kyiv", "Europe/Kiev", "Europe/Simferopol", "Europe/Uzhgorod", "Europe/Zaporozhye"], BY: ["Europe/Minsk"], MD: ["Europe/Chisinau", "Europe/Tiraspol"], EE: ["Europe/Tallinn"], LV: ["Europe/Riga"], LT: ["Europe/Vilnius"],
    TR: ["Europe/Istanbul", "Asia/Istanbul"], GE: ["Asia/Tbilisi"], AM: ["Asia/Yerevan"], AZ: ["Asia/Baku"],
    JP: ["Asia/Tokyo"], CN: ["Asia/Shanghai", "Asia/Chongqing", "Asia/Harbin", "Asia/Urumqi", "Asia/Kashgar"], HK: ["Asia/Hong_Kong"], MO: ["Asia/Macau"], TW: ["Asia/Taipei"], KR: ["Asia/Seoul"], KP: ["Asia/Pyongyang"], MN: ["Asia/Ulaanbaatar", "Asia/Hovd", "Asia/Choibalsan"],
    IN: ["Asia/Kolkata", "Asia/Calcutta"], PK: ["Asia/Karachi"], BD: ["Asia/Dhaka"], LK: ["Asia/Colombo"], NP: ["Asia/Kathmandu"], BT: ["Asia/Thimphu"], MM: ["Asia/Yangon", "Asia/Rangoon"], TH: ["Asia/Bangkok"], VN: ["Asia/Ho_Chi_Minh", "Asia/Saigon"], KH: ["Asia/Phnom_Penh"], LA: ["Asia/Vientiane"], MY: ["Asia/Kuala_Lumpur", "Asia/Kuching"], SG: ["Asia/Singapore"], ID: ["Asia/Jakarta", "Asia/Pontianak", "Asia/Makassar", "Asia/Jayapura"], PH: ["Asia/Manila"], BN: ["Asia/Brunei"], TL: ["Asia/Dili"],
    SA: ["Asia/Riyadh"], AE: ["Asia/Dubai"], QA: ["Asia/Qatar"], BH: ["Asia/Bahrain"], KW: ["Asia/Kuwait"], OM: ["Asia/Muscat"], YE: ["Asia/Aden"], IL: ["Asia/Jerusalem", "Asia/Tel_Aviv"], PS: ["Asia/Gaza", "Asia/Hebron"], JO: ["Asia/Amman"], LB: ["Asia/Beirut"], SY: ["Asia/Damascus"], IQ: ["Asia/Baghdad"], IR: ["Asia/Tehran"], AF: ["Asia/Kabul"],
    KZ: ["Asia/Almaty", "Asia/Aqtobe", "Asia/Aqtau", "Asia/Atyrau", "Asia/Oral", "Asia/Qostanay", "Asia/Qyzylorda"], UZ: ["Asia/Tashkent", "Asia/Samarkand"], TM: ["Asia/Ashgabat"], TJ: ["Asia/Dushanbe"], KG: ["Asia/Bishkek"],
    EG: ["Africa/Cairo"], ZA: ["Africa/Johannesburg"], NG: ["Africa/Lagos"], KE: ["Africa/Nairobi"], GH: ["Africa/Accra"], ET: ["Africa/Addis_Ababa"], MA: ["Africa/Casablanca"], DZ: ["Africa/Algiers"], TN: ["Africa/Tunis"], LY: ["Africa/Tripoli"], SD: ["Africa/Khartoum"], TZ: ["Africa/Dar_es_Salaam"], UG: ["Africa/Kampala"], CI: ["Africa/Abidjan"], SN: ["Africa/Dakar"], CM: ["Africa/Douala"], CD: ["Africa/Kinshasa", "Africa/Lubumbashi"], AO: ["Africa/Luanda"], ZW: ["Africa/Harare"], ZM: ["Africa/Lusaka"], MZ: ["Africa/Maputo"], RW: ["Africa/Kigali"], MG: ["Indian/Antananarivo"], MU: ["Indian/Mauritius"],
    AU: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Perth", "Australia/Adelaide", "Australia/Hobart", "Australia/Darwin", "Australia/Broken_Hill", "Australia/Lindeman", "Australia/Currie", "Australia/Lord_Howe", "Australia/Eucla"], NZ: ["Pacific/Auckland", "Pacific/Chatham"], FJ: ["Pacific/Fiji"], PG: ["Pacific/Port_Moresby"], WS: ["Pacific/Apia"], TO: ["Pacific/Tongatapu"], GU: ["Pacific/Guam"],
  };
  const TZ_CC = {};
  for (const cc in G) for (const z of G[cc]) TZ_CC[z] = cc;

  // ---- country -> flag spec ----
  // types: h (horizontal stripes), v (vertical stripes), cross (Nordic),
  // plus (centered cross), disc (field+circle), crescent, wave (fallback),
  // plus specials: us, uk, cn, kr, br, jm, cl, za, il, au, nz.
  // overlays: tri (left triangle), vband (left vertical band), cdisc (center disc).
  const F = {
    GB: { t: "uk" }, US: { t: "us" }, CN: { t: "cn" }, KR: { t: "kr" }, BR: { t: "br" }, JM: { t: "jm" }, CL: { t: "cl" }, ZA: { t: "za" }, IL: { t: "il" }, AU: { t: "au" }, NZ: { t: "nz" },
    IE: { t: "v", c: ["#169b62", W, "#ff883e"] }, FR: { t: "v", c: ["#0055a4", W, "#ef4135"] }, IT: { t: "v", c: ["#009246", W, "#ce2b37"] }, BE: { t: "v", c: [K, "#fae042", "#ed2939"] }, RO: { t: "v", c: ["#002b7f", "#fcd116", "#ce1126"] }, MD: { t: "v", c: ["#0046ae", "#ffd200", "#cc092f"], cdisc: "#cc092f", cr: 0.06 },
    NL: { t: "h", c: ["#ae1c28", W, "#21468b"] }, LU: { t: "h", c: ["#ed2939", W, "#00a3e0"] }, DE: { t: "h", c: [K, "#dd0000", "#ffce00"] }, RU: { t: "h", c: [W, "#0039a6", "#d52b1e"] }, AT: { t: "h", c: ["#ed2939", W, "#ed2939"] }, HU: { t: "h", c: ["#cd2a3e", W, "#436f4d"] }, BG: { t: "h", c: [W, "#00966e", "#d62612"] }, LT: { t: "h", c: ["#fdb913", "#006a44", "#c1272d"] }, EE: { t: "h", c: ["#0072ce", K, W] },
    PL: { t: "h", c: [W, "#dc143c"] }, ID: { t: "h", c: ["#ce1126", W] }, SG: { t: "h", c: ["#ef3340", W] }, UA: { t: "h", c: ["#0057b7", "#ffd700"] },
    ES: { t: "h", c: ["#aa151b", "#f1bf00", "#f1bf00", "#aa151b"] }, CO: { t: "h", c: ["#fcd116", "#fcd116", "#003893", "#ce1126"] }, VE: { t: "h", c: ["#ffcc00", "#00247d", "#cf142b"] }, EC: { t: "h", c: ["#ffdd00", "#ffdd00", "#034ea2", "#ed1c24"] }, BO: { t: "h", c: ["#d52b1e", "#f9e300", "#007934"] }, LT2: 0,
    PT: { t: "v", c: ["#046a38", "#046a38", "#da291c", "#da291c", "#da291c"], cdisc: "#ffe000", cr: 0.07 }, PE: { t: "v", c: ["#d91023", W, "#d91023"] }, NG: { t: "v", c: ["#008751", W, "#008751"] }, GT: { t: "v", c: ["#4997d0", W, "#4997d0"] },
    CA: { t: "v", c: ["#ff0000", W, "#ff0000"], cdisc: "#ff0000", cr: 0.11 }, MX: { t: "v", c: ["#006847", W, "#ce1126"], cdisc: "#7a3b2e", cr: 0.08 },
    CH: { t: "plus", field: "#d52b1e", cross: W, th: 0.22 },
    DK: { t: "cross", field: "#c8102e", cross: W }, SE: { t: "cross", field: "#006aa7", cross: "#fecc00" }, NO: { t: "cross", field: "#ba0c2f", cross: "#00205b", th: 0.18 }, FI: { t: "cross", field: W, cross: "#003580" }, IS: { t: "cross", field: "#02529c", cross: "#dc1e35" },
    JP: { t: "disc", field: W, disc: "#bc002d", r: 0.2 }, BD: { t: "disc", field: "#006a4e", disc: "#f42a41", cx: 0.45, r: 0.2 }, VN: { t: "disc", field: "#da251d", disc: "#ffff00", r: 0.16 }, LA: { t: "disc", field: "#002868", disc: W, r: 0.16, bands: ["#ce1126", "#002868", "#002868", "#ce1126"] },
    TR: { t: "crescent", field: "#e30a17", fg: W, cx: 0.4 }, PK: { t: "crescent", field: "#01411c", fg: W, band: W, bandw: 0.28, cx: 0.62 }, TN: { t: "disc", field: "#e70013", disc: W, r: 0.22 }, DZ: { t: "crescent", field: "#006233", fieldR: W, fg: "#d21034", cx: 0.5 },
    IN: { t: "h", c: ["#ff9933", W, "#138808"], cdisc: "#000080", cr: 0.06 }, IR: { t: "h", c: ["#239f40", W, "#da0000"], cdisc: "#da0000", cr: 0.05 }, EG: { t: "h", c: ["#ce1126", W, K], cdisc: "#c09300", cr: 0.06 }, SY: { t: "h", c: ["#ce1126", W, K] }, IQ: { t: "h", c: ["#ce1126", W, K] }, YE: { t: "h", c: ["#ce1126", W, K] },
    AE: { t: "h", c: ["#009639", W, K], vband: "#ff0000", vbw: 0.28 }, KW: { t: "h", c: ["#007a3d", W, "#ce1126"], tri: K }, JO: { t: "h", c: [K, W, "#007a3d"], tri: "#ce1126" }, SD: { t: "h", c: ["#d21034", W, K], tri: "#007a3d" }, PS: { t: "h", c: [K, W, "#007a3d"], tri: "#ce1126" },
    SA: { t: "h", c: ["#165d31"] }, LY: { t: "h", c: ["#e70013", K, "#239e46"], cdisc: W, cr: 0.05 }, MA: { t: "h", c: ["#c1272d"], cdisc: "#006233", cr: 0.12 },
    GR: { t: "h", c: ["#0d5eaf", W, "#0d5eaf", W, "#0d5eaf", W, "#0d5eaf", W, "#0d5eaf"] }, TH: { t: "h", c: ["#a51931", W, "#2d2a4a", "#2d2a4a", W, "#a51931"] }, CR: { t: "h", c: ["#002b7f", W, "#ce1126", "#ce1126", W, "#002b7f"] },
    CZ: { t: "h", c: [W, "#d7141a"], tri: "#11457e" }, PH: { t: "h", c: ["#0038a8", "#ce1126"], tri: W, cdiscTri: "#fcd116" }, SV: { t: "h", c: ["#0f47af", W, "#0f47af"] }, HN: { t: "h", c: ["#0073cf", W, "#0073cf"] }, NI: { t: "h", c: ["#0067c6", W, "#0067c6"] },
    HR: { t: "h", c: ["#ff0000", W, "#171796"] }, RS: { t: "h", c: ["#c6363c", "#0c4076", W] }, SI: { t: "h", c: [W, "#0000ff", "#ff0000"] }, SK: { t: "h", c: [W, "#0b4ea2", "#ee1c25"], cdisc: "#ee1c25", cr: 0.06 }, BA: { t: "h", c: ["#002395", "#002395", "#fecb00"], tri: "#002395" }, ME: { t: "h", c: ["#c40308"], cdisc: "#d4af37", cr: 0.16 }, MK: { t: "h", c: ["#d20000"], cdisc: "#ffe600", cr: 0.16 }, AL: { t: "h", c: ["#e41e20"], cdisc: K, cr: 0.16 },
    AR: { t: "h", c: ["#74acdf", W, "#74acdf"], cdisc: "#f6b40e", cr: 0.07 }, UY: { t: "h", c: [W, "#0038a8", W, "#0038a8", W, "#0038a8", W, "#0038a8", W] }, PY: { t: "h", c: ["#d52b1e", W, "#0038a8"], cdisc: "#0038a8", cr: 0.05 },
    KP: { t: "h", c: ["#024fa2", W, "#ed1c27", "#ed1c27", W, "#024fa2"], cdisc: W, cr: 0.07 }, LK: { t: "v", c: ["#ff9933", "#00534e", "#8d153a", "#8d153a", "#8d153a"] }, MM: { t: "h", c: ["#fecb00", "#34b233", "#ea2839"], cdisc: W, cr: 0.12 },
    KE: { t: "h", c: [K, W, "#bb0000", W, "#006600"], cdisc: "#7a1f2b", cr: 0.08 }, GH: { t: "h", c: ["#ce1126", "#fcd116", "#006b3f"], cdisc: K, cr: 0.06 }, ET: { t: "h", c: ["#078930", "#fcdd09", "#da121a"], cdisc: "#0f47af", cr: 0.1 }, BY: { t: "h", c: ["#c8313e", "#c8313e", "#4aa657"] },
    KZ: { t: "h", c: ["#00afca"], cdisc: "#fec50c", cr: 0.12 }, UZ: { t: "h", c: ["#0099b5", W, "#1eb53a"] }, AZ: { t: "h", c: ["#00b5e2", "#ed2939", "#3f9c35"], cdisc: W, cr: 0.06 }, AM: { t: "h", c: ["#d90012", "#0033a0", "#f2a800"] }, GE: { t: "plus", field: W, cross: "#ff0000", th: 0.16 },
    LV: { t: "h", c: ["#9e1b32", "#9e1b32", W, "#9e1b32", "#9e1b32"] }, LB: { t: "h", c: ["#ed1c24", W, W, "#ed1c24"], cdisc: "#00a651", cr: 0.06 }, QA: { t: "v", c: [W, "#8a1538", "#8a1538", "#8a1538", "#8a1538"] }, BH: { t: "v", c: [W, "#ce1126", "#ce1126", "#ce1126"] }, OM: { t: "h", c: [W, "#db161b", "#008000"], vband: "#db161b", vbw: 0.3 },
    HK: { t: "h", c: ["#de2910"], cdisc: W, cr: 0.12 }, MO: { t: "h", c: ["#00785e"], cdisc: W, cr: 0.1 }, TW: { t: "canton", c: ["#fe0000"], canton: "#000095", cw: 0.5, ch: 0.5, cantonStar: W }, MN: { t: "v", c: ["#c4272e", "#015197", "#c4272e"] },
    NP: { t: "h", c: ["#dc143c"], cdisc: W, cr: 0.1 }, KH: { t: "h", c: ["#032ea1", "#e00025", "#e00025", "#032ea1"], cdisc: W, cr: 0.08 }, MY: { t: "canton", c: ["#cc0001", W, "#cc0001", W, "#cc0001", W, "#cc0001", W, "#cc0001", W, "#cc0001", W, "#cc0001", W], canton: "#010066", cw: 0.5, ch: 0.54, cantonStar: "#ffcc00" },
    NG2: 0, CI: { t: "v", c: ["#f77f00", W, "#009e60"] }, SN: { t: "v", c: ["#00853f", "#fdef42", "#e31b23"], cdisc: "#00853f", cr: 0.05 }, CM: { t: "v", c: ["#007a5e", "#ce1126", "#fcd116"], cdisc: "#fcd116", cr: 0.05 }, DZ2: 0,
    FJ: { t: "canton", c: ["#68bfe5"], canton: "#012169", cw: 0.5, ch: 0.5 }, PG: { t: "jm" },
    DO: { t: "plus", field: W, cross: W, th: 0.16, quarters: ["#002d62", "#ce1126", "#002d62", "#ce1126"] }, CU: { t: "canton", c: ["#002a8f", W, "#002a8f", W, "#002a8f"], canton: null, tri: "#cf142b", triStar: W }, PR: { t: "canton", c: ["#ed0000", W, "#ed0000", W, "#ed0000"], canton: null, tri: "#0050f0", triStar: W },
    CY: { t: "h", c: [W], cdisc: "#d57800", cr: 0.12 }, MT: { t: "v", c: [W, "#cf142b"] }, LI2: 0, MG: { t: "mg" }, MU: { t: "h", c: ["#ea2839", "#1a206d", "#ffd500", "#00a551"] },
  };

  // strip the throwaway "0" placeholder keys used to avoid accidental dup edits
  delete F.LT2; delete F.NG2; delete F.DZ2; delete F.LI2;

  // ---- sampling helpers ----
  const band = (arr, t) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(t * arr.length)))];
  const inLeftTri = (u, v, w) => u <= w * (1 - Math.abs(v - 0.5) * 2);

  function uk(u, v) {
    const blue = "#012169", red = "#c8102e";
    const d1 = Math.abs(u - v), d2 = Math.abs(u - (1 - v));
    if (Math.abs(u - 0.5) < 0.06 || Math.abs(v - 0.5) < 0.09) return red;       // St George inner
    if (Math.abs(u - 0.5) < 0.11 || Math.abs(v - 0.5) < 0.15) return W;          // white fimbriation
    if (d1 < 0.06 || d2 < 0.06) return red;                                      // St Patrick saltire
    if (d1 < 0.13 || d2 < 0.13) return W;                                        // St Andrew saltire
    return blue;
  }
  function us(u, v) {
    if (u < 0.4 && v < 0.538) {
      const gx = u / 0.4 * 6, gy = v / 0.538 * 5;
      if (Math.abs(gx - Math.round(gx)) < 0.24 && Math.abs(gy - Math.round(gy)) < 0.24) return W;
      return "#3c3b6e";
    }
    return Math.floor(v * 13) % 2 === 0 ? "#b22234" : W;
  }
  function cn(u, v) {
    const y = "#ffde00";
    if (Math.hypot(u - 0.16, v - 0.3) < 0.075) return y;
    const small = [[0.31, 0.15], [0.38, 0.26], [0.38, 0.42], [0.3, 0.52]];
    for (const s of small) if (Math.hypot(u - s[0], v - s[1]) < 0.03) return y;
    return "#de2910";
  }
  function kr(u, v) {
    const d = Math.hypot(u - 0.5, v - 0.5);
    if (d < 0.16) return v < 0.5 ? "#cd2e3a" : "#0047a0";
    const tg = [[0.22, 0.27], [0.78, 0.27], [0.22, 0.73], [0.78, 0.73]];
    for (const s of tg) if (Math.abs(u - s[0]) < 0.06 && Math.abs(v - s[1]) < 0.07) return K;
    return W;
  }
  function br(u, v) {
    if (Math.hypot(u - 0.5, v - 0.5) < 0.17) return "#002776";
    if (Math.abs(u - 0.5) / 0.5 + Math.abs(v - 0.5) / 0.5 < 0.82) return "#ffdf00";
    return "#009b3a";
  }
  function jm(u, v) {
    const d1 = Math.abs(u - v), d2 = Math.abs(u - (1 - v));
    if (d1 < 0.12 || d2 < 0.12) return "#ffb81c";
    if (v < u && v < 1 - u) return "#009b3a";
    if (v > u && v > 1 - u) return "#009b3a";
    return K;
  }
  function cl(u, v) {
    if (v < 0.5) {
      if (u < 0.33) return Math.hypot(u - 0.165, v - 0.25) < 0.085 ? W : "#0039a6";
      return W;
    }
    return "#d52b1e";
  }
  function za(u, v) {
    if (inLeftTri(u, v, 0.3)) return K;
    if (Math.abs(v - 0.5) < 0.14) return "#007a4d";
    if (Math.abs(v - 0.5) < 0.2) return "#ffb915";
    return v < 0.5 ? "#de3831" : "#002395";
  }
  function il(u, v) {
    const blue = "#0038b8";
    if ((v > 0.16 && v < 0.27) || (v > 0.73 && v < 0.84)) return blue;
    const d = Math.hypot(u - 0.5, v - 0.5);
    if (d > 0.1 && d < 0.16) return blue;
    return W;
  }
  function auBase(u, v, starColor) {
    if (u < 0.5 && v < 0.5) return uk(u / 0.5, v / 0.5);
    const stars = [[0.74, 0.3, 0.045], [0.84, 0.52, 0.05], [0.72, 0.7, 0.04], [0.8, 0.82, 0.035], [0.64, 0.56, 0.025]];
    for (const s of stars) if (Math.hypot(u - s[0], v - s[1]) < s[2]) return starColor;
    if (u < 0.5 && Math.hypot(u - 0.25, v - 0.78) < 0.06) return starColor;
    return "#00247d";
  }

  function flagColorAt(s, u, v) {
    let col;
    switch (s.t) {
      case "uk": col = uk(u, v); break;
      case "us": col = us(u, v); break;
      case "cn": col = cn(u, v); break;
      case "kr": col = kr(u, v); break;
      case "br": col = br(u, v); break;
      case "jm": col = jm(u, v); break;
      case "cl": col = cl(u, v); break;
      case "za": col = za(u, v); break;
      case "il": col = il(u, v); break;
      case "au": col = auBase(u, v, W); break;
      case "nz": col = auBase(u, v, "#cc142b"); break;
      case "mg": col = u < 0.32 ? W : (v < 0.5 ? "#fc3d32" : "#007e3a"); break;
      case "wave": col = Math.abs(v - (0.5 + 0.16 * Math.sin(u * 6.2))) < 0.13 ? W : "#ff5a2e"; break;
      case "v": col = band(s.c, u); break;
      case "h": col = band(s.c, v); break;
      case "cross": {
        const vx = s.vx == null ? 0.34 : s.vx, th = s.th == null ? 0.16 : s.th;
        col = (Math.abs(u - vx) < th / 2 || Math.abs(v - 0.5) < th / 2) ? s.cross : s.field;
        break;
      }
      case "plus": {
        const th = s.th == null ? 0.2 : s.th;
        if (Math.abs(u - 0.5) < th / 2 || Math.abs(v - 0.5) < th / 2) col = s.cross;
        else if (s.quarters) col = s.quarters[(u < 0.5 ? 0 : 1) + (v < 0.5 ? 0 : 2)];
        else col = s.field;
        break;
      }
      case "disc": {
        const base = s.bands ? band(s.bands, v) : s.field;
        const cx = s.cx == null ? 0.5 : s.cx, r = s.r == null ? 0.22 : s.r;
        col = Math.hypot(u - cx, v - 0.5) < r ? s.disc : base;
        break;
      }
      case "crescent": {
        const fieldL = s.field, fieldR = s.fieldR || s.field, fg = s.fg || W;
        if (s.band && u < (s.bandw || 0.25)) { col = s.band; break; }
        const cx = s.cx == null ? 0.42 : s.cx;
        const d1 = Math.hypot(u - cx, v - 0.5), d2 = Math.hypot(u - (cx + 0.09), v - 0.5);
        if (d1 < 0.2 && d2 > 0.16) col = fg;
        else if (Math.hypot(u - (cx + 0.22), v - 0.5) < 0.05) col = fg;
        else col = u < 0.5 ? fieldL : fieldR;
        break;
      }
      case "canton": {
        const cw = s.cw == null ? 0.4 : s.cw, ch = s.ch == null ? (s.c.length > 1 ? 0.5 : 1) : s.ch;
        if (s.canton && u < cw && v < ch) {
          col = s.canton;
          if (s.cantonStar && Math.hypot(u - cw / 2, v - ch / 2) < Math.min(cw, ch) * 0.28) col = s.cantonStar;
        } else col = band(s.c, v);
        break;
      }
      default: col = W;
    }
    // overlays
    if (s.vband && u < (s.vbw || 0.34)) col = s.vband;
    if (s.tri && inLeftTri(u, v, s.triw || 0.42)) {
      col = s.tri;
      if (s.triStar && Math.hypot(u - 0.14, v - 0.5) < 0.06) col = s.triStar || W;
      if (s.cdiscTri && Math.hypot(u - 0.14, v - 0.5) < 0.06) col = s.cdiscTri;
    }
    if (s.cdisc && Math.hypot(u - 0.5, v - 0.5) < (s.cr || 0.12)) col = s.cdisc;
    return col;
  }

  const FALLBACK = { t: "wave" };
  function specForCountry(cc) {
    return (cc && F[cc]) || FALLBACK;
  }
  function tzCountry(tz) {
    return TZ_CC[tz] || null;
  }

  window.GoodHabitsFlags = { tzCountry, specForCountry, flagColorAt };
})();
