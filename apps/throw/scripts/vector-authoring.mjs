/** Original editable illustration masters. Shapes, materials and body parts are shared,
 * rather than tracing the raster atlas or regenerating an actor for every pose. */
export const PALETTES = {
  original: {
    wood: '#9b6140',
    lightWood: '#bb8052',
    darkWood: '#684333',
    cream: '#e8d5b0',
    paper: '#f4e7c9',
    teal: '#355d60',
    tealLight: '#557779',
    red: '#853d45',
    gold: '#c99a50',
    skin: '#d5a17e',
    trousers: '#514c47',
    hair: '#654338',
  },
  midnight: {
    wood: '#665363',
    lightWood: '#94746b',
    darkWood: '#493f4d',
    cream: '#c3c8cc',
    paper: '#e8e1d6',
    teal: '#42536f',
    tealLight: '#677e95',
    red: '#794d6a',
    gold: '#d0b775',
    skin: '#d5a17e',
    trousers: '#454452',
    hair: '#654338',
  },
};
const path = (d, fill, extra = '') =>
  `<path d="${d}" fill="${fill}" ${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const circle = (x, y, r, fill, extra = '') =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, color, width = 1) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
export const PROPS = [
  'door',
  'window',
  'bookshelf',
  'desk',
  'streetlamp',
  'hanginglamp',
  'cabinet',
  'plant',
];
export const BOUNDS = {
  door: [20, 8, 160, 240],
  window: [22, 14, 156, 228],
  bookshelf: [14, 10, 172, 238],
  desk: [6, 90, 188, 158],
  streetlamp: [60, 4, 80, 248],
  hanginglamp: [18, 4, 164, 144],
  cabinet: [14, 104, 172, 144],
  plant: [24, 58, 152, 190],
};
export function defs(p) {
  return `<defs>
    <linearGradient id="wood" x2="1" y2=".3"><stop stop-color="${p.lightWood}"/><stop offset=".45" stop-color="${p.wood}"/><stop offset="1" stop-color="${p.darkWood}"/></linearGradient>
    <linearGradient id="brass" x2=".9" y2=".3"><stop stop-color="#ead29a"/><stop offset=".4" stop-color="${p.gold}"/><stop offset="1" stop-color="#947044"/></linearGradient>
    <linearGradient id="glass" x2=".7" y2="1"><stop stop-color="#70969a"/><stop offset="1" stop-color="#365663"/></linearGradient>
    <linearGradient id="shade" x2=".7" y2=".8"><stop stop-color="${p.tealLight}"/><stop offset=".55" stop-color="${p.teal}"/><stop offset="1" stop-color="#304b50"/></linearGradient>
  </defs>`;
}
function book(x, y, h, w, color, tilt = 0) {
  return `<g transform="rotate(${tilt} ${x} ${y + h})">${rect(x, y, w, h, color, 'rx="1"')}${line(x + 2, y + 4, x + w - 2, y + 4, '#d6b886', 0.8)}${line(x + 2, y + h - 5, x + w - 2, y + h - 5, '#d6b886', 0.8)}</g>`;
}
function card(x, y, angle = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${angle})">${rect(-7, -10, 14, 20, '#f1dfbb', 'rx="1" stroke="#9c7f60" stroke-width=".5"')}${path('M0 -5C-7 0 -5 5 0 2C5 5 7 0 0 -5M0 1L-2 5H2Z', '#743e43')}</g>`;
}
export function prop(id, p = PALETTES.original) {
  switch (id) {
    case 'door':
      return `<g id="door-frame">${rect(28, 22, 144, 226, p.cream)}${rect(44, 36, 112, 212, p.darkWood)}${rect(49, 42, 102, 206, 'url(#wood)')}${rect(20, 8, 160, 9, p.paper)}${rect(24, 17, 152, 8, p.cream)}${rect(28, 25, 144, 4, '#bba284')}${rect(29, 32, 10, 216, p.paper)}${rect(161, 32, 10, 216, '#c4b390')}${path('M59 103V81C59 49 141 49 141 81V103Z', p.darkWood)}${path('M64 98V82C64 57 136 57 136 82V98Z', '#637275')}${path('M100 56V102M62 86H138M100 57L65 84M100 57L135 84', 'none', `stroke="${p.lightWood}" stroke-width="4"`)}${rect(60, 111, 80, 53, p.darkWood, 'rx="1"')}${rect(65, 116, 70, 44, p.wood)}${rect(60, 174, 80, 59, p.darkWood)}${rect(65, 180, 70, 47, p.wood)}${line(65, 118, 134, 118, p.lightWood)}${line(65, 182, 134, 182, p.lightWood)}${rect(137, 133, 5, 25, 'url(#brass)', 'rx="2"')}${circle(138, 136, 4, 'url(#brass)')}${path('M138 140V149Q138 153 130 153', 'none', 'stroke="#d7b46d" stroke-width="3" stroke-linecap="round"')}${rect(45, 241, 111, 7, '#78614b')}</g>`;
    case 'window':
      return `${rect(22, 14, 156, 228, p.cream)}${rect(30, 22, 140, 211, p.darkWood)}${rect(35, 27, 130, 201, 'url(#glass)')}${path('M35 172L66 121L83 142L103 99L136 155L165 123V228H35Z', '#314d5b', 'opacity=".58"')}${path('M44 28L111 28L44 106ZM165 58L165 99L96 178L69 178Z', '#dce6dc', 'opacity=".09"')}${rect(96, 24, 8, 207, p.cream)}${rect(32, 119, 136, 7, p.cream)}${rect(20, 233, 160, 9, p.paper)}${line(38, 29, 38, 225, '#d3ddd0', 0.7)}${line(107, 30, 160, 30, '#d3ddd0', 0.7)}`;
    case 'bookshelf':
      return `${rect(21, 17, 158, 228, 'url(#wood)', 'rx="2"')}${rect(31, 28, 138, 207, p.darkWood)}${[30, 96, 162, 231].map((y) => rect(28, y, 144, 5, p.lightWood) + rect(28, y + 5, 144, 3, p.wood)).join('')}${rect(14, 10, 172, 7, p.darkWood)}${rect(18, 17, 164, 6, p.lightWood)}${rect(20, 240, 160, 8, p.darkWood)}${[book(35, 45, 50, 9, p.red), book(45, 53, 42, 10, p.teal), book(56, 46, 49, 12, '#c39854'), book(72, 53, 42, 9, '#687763', -9), book(90, 65, 30, 9, '#9d7861')].join('')}${path('M118 93V63Q118 43 133 43Q148 43 148 63V93Z', 'none', 'stroke="#c8a258" stroke-width="2"')}${[123, 130, 137, 144].map((x) => line(x, 52, x, 93, '#c8a258', 0.8)).join('')}${line(117, 69, 149, 69, '#c8a258')}${path('M129 78Q134 68 140 77L146 80L140 81Q136 87 129 82Z', p.paper)}${line(132, 82, 132, 89, p.gold)}${circle(133, 40, 3, p.gold)}${card(47, 141, -4)}${card(72, 142, 7)}${path('M113 134L116 151H143L146 134Z', '#343e42')}${rect(109, 149, 40, 5, '#283539', 'rx="2"')}${[book(38, 176, 54, 10, '#73755b'), book(50, 181, 49, 11, p.teal), book(64, 177, 53, 9, p.red), book(77, 189, 41, 10, '#ba8c56', -6)].join('')}${rect(111, 200, 42, 29, 'url(#wood)', 'rx="2" stroke="#c29a61" stroke-width="1.5"')}${line(114, 210, 151, 210, p.gold)}${rect(130, 207, 6, 8, 'url(#brass)', 'rx="1"')}`;
    case 'desk':
      return `${path('M18 147L16 248H24L29 151ZM173 147L177 248H185L183 146Z', 'url(#wood)')}${path('M56 145L58 229H65L65 145ZM139 145L139 229H146L149 145Z', p.darkWood)}${rect(20, 149, 165, 13, p.darkWood)}${rect(6, 139, 188, 12, 'url(#wood)', 'rx="2"')}${path('M34 137Q89 132 153 136L160 176Q139 179 121 173L107 181L80 173L46 179Z', p.red)}${path('M38 139Q91 136 150 139L154 143L38 143Z', '#a25456')}${path('M48 174Q65 168 81 171M119 170Q138 174 151 172', 'none', 'stroke="#c4a259" stroke-width="1.5"')}${[49, 77, 119, 148].map((x) => line(x, 174, x, 179, p.gold, 0.7)).join('')}${card(84, 137, 76)}${card(103, 135, 94)}${path('M137 107L140 130H164L167 107Z', '#343a3a')}${rect(132, 128, 40, 5, '#2f3738', 'rx="2"')}${rect(141, 118, 22, 4, p.red)}${path('M32 112L34 136H47L49 112Z', 'url(#brass)')}${line(37, 127, 31, 95, '#4c4c44', 3)}${path('M41 121Q49 95 64 90Q56 106 45 122Z', p.red)}`;
    case 'streetlamp':
      return `${rect(94, 48, 10, 192, '#3e4c4d', 'rx="3"')}${rect(93, 52, 3, 175, '#68736b')}${path('M77 42L83 78H116L123 42Z', '#34494b')}${path('M85 47L89 72H111L116 47Z', '#e9bf70')}${path('M92 49L94 71H101V49Z', '#f5d98b')}${path('M73 42Q75 27 100 23Q125 27 127 42Z', '#34494b')}${path('M80 34Q95 25 113 30', 'none', 'stroke="#687b71" stroke-width="2"')}${circle(100, 21, 4, p.gold)}${rect(78, 77, 44, 5, '#34494b', 'rx="2"')}${path('M95 225L89 240H111L105 225Z', '#3e4c4d')}${rect(76, 239, 48, 9, '#34494b', 'rx="3"')}${rect(71, 248, 58, 4, '#53625d')}${line(100, 4, 100, 18, '#3e4c4d', 3)}`;
    case 'hanginglamp':
      return `${rect(95, 4, 9, 60, '#414b48')}${path('M78 69Q85 61 100 61Q115 61 122 69L130 102H70Z', 'url(#shade)')}${path('M71 92Q48 117 18 131Q99 146 182 131Q151 116 129 92Z', 'url(#shade)')}${path('M23 131Q103 142 177 131', 'none', 'stroke="#91a093" stroke-width="2"')}${rect(94, 56, 12, 10, 'url(#brass)', 'rx="3"')}${circle(100, 136, 10, '#edc879')}${path('M94 136Q100 129 106 136', 'none', 'stroke="#f6e3ad" stroke-width="2"')}${path('M75 95Q82 73 95 70', 'none', 'stroke="#8da69a" stroke-width="2" opacity=".6"')}`;
    case 'cabinet':
      return `${rect(24, 132, 152, 107, 'url(#wood)', 'rx="2"')}${rect(14, 126, 172, 9, p.darkWood, 'rx="2"')}${[143, 174, 205].map((y) => rect(32, y, 136, 27, p.darkWood, 'rx="1"') + rect(34, y + 2, 132, 23, p.wood) + line(36, y + 3, 165, y + 3, p.lightWood) + rect(88, y + 10, 24, 4, 'url(#brass)', 'rx="2"')).join('')}${rect(29, 238, 12, 10, p.darkWood)}${rect(159, 238, 12, 10, p.darkWood)}${path('M41 125V114Q41 104 57 104Q73 104 73 114V125Z', p.wood)}${path('M47 124V114Q47 109 57 109Q67 109 67 114V124Z', '#50453b')}${[51, 55, 59, 63].map((x) => line(x, 115, x, 122, p.gold)).join('')}${circle(68, 121, 2, p.gold)}${book(92, 119, 7, 50, p.teal)}${book(97, 113, 6, 44, p.red)}`;
    case 'plant':
      return `${path('M65 187L75 242Q101 254 128 242L138 187Z', '#a9654b')}${path('M67 188L76 237Q80 244 89 246L80 188Z', '#c28660')}${path('M64 186Q100 179 139 186L138 195Q98 201 65 195Z', '#bd805a')}${path('M100 188Q95 133 112 76M104 154Q78 124 57 102M105 137Q133 99 155 82M100 166Q71 156 45 143M104 177Q138 151 160 126', 'none', 'stroke="#66724c" stroke-width="4"')}${path('M112 79Q81 75 94 59Q124 56 112 79ZM112 98Q132 67 150 77Q158 101 112 98ZM94 125Q61 124 49 100Q76 84 94 125ZM107 138Q119 98 149 109Q151 134 107 138ZM98 163Q57 173 25 145Q45 124 98 163ZM115 173Q133 130 174 131Q180 166 115 173ZM99 112Q78 90 80 69Q100 63 106 103Z', '#64764c')}${path('M95 120Q69 113 56 104M113 133Q129 117 143 115M107 167Q80 158 41 149M123 166Q147 145 166 139', 'none', 'stroke="#899464" stroke-width="1.4"')}`;
    default:
      throw new Error(`Unknown vector prop ${id}`);
  }
}

const rotate = (angle, x, y, body) =>
  `<g transform="rotate(${angle.toFixed(2)} ${x} ${y})">${body}</g>`;
/** Fixed adult body, independent thigh/shin/boot/arm/head/scarf paths; all poses share identity. */
export function hero(frame = 0, walking = false, p = PALETTES.original) {
  const phase = (frame / 8) * Math.PI * 2;
  const swing = walking ? Math.sin(phase) * 23 : Math.sin(phase) * 1.2;
  const bodyY = walking
    ? -Math.abs(Math.sin(phase)) * 2
    : Math.sin(phase) * 0.7;
  const leg = (angle, back) =>
    rotate(
      angle,
      96,
      151,
      path(
        'M86 144Q99 140 108 147L104 194L89 195Z',
        back ? '#464745' : p.trousers,
      ) +
        rotate(
          walking ? Math.max(0, -angle) * 0.65 : 0,
          96,
          189,
          path(
            'M89 184L104 184L105 232L91 233Z',
            back ? '#464745' : p.trousers,
          ) +
            path(
              'M90 223L105 223L107 232Q121 233 124 240Q116 245 88 242Z',
              back ? '#514139' : '#674e3e',
            ) +
            line(93, 226, 103, 226, '#997456', 0.8),
        ),
    );
  const arm = (angle, back) =>
    rotate(
      angle,
      103,
      73,
      path(
        'M91 72Q99 68 107 74L113 105L103 111L92 88Z',
        back ? '#2f4e52' : p.teal,
      ) +
        rotate(
          back ? -7 : -13,
          108,
          106,
          path('M101 101L114 102L116 130L107 132Z', back ? '#2f4e52' : p.teal) +
            path('M108 129L115 128L117 138Q117 145 111 144L107 139Z', p.skin),
        ),
    );
  return `<g id="eli-pose" transform="translate(0 ${bodyY.toFixed(2)})">
    <g id="back-leg">${leg(-swing, true)}</g><g id="back-arm">${arm(swing * 0.65, true)}</g>
    <g id="front-leg">${leg(swing, false)}</g>
    <g id="coat">${path('M87 65Q94 59 108 66L117 87L111 119L116 159L87 175L74 166L83 120L81 84Z', p.teal)}${path('M96 68L103 66L111 98L104 119L109 151L91 157L91 101Z', p.cream)}${path('M85 71L96 64L91 88L99 98L86 111Z', p.tealLight)}${path('M103 66L111 70L114 98L105 91Z', '#254a50')}${path('M83 118L88 115L89 153L79 164Z', '#3d6668')}${line(86, 119, 80, 160, '#28494e', 0.8)}${line(105, 112, 109, 143, '#aaac91', 0.7)}${circle(100, 116, 1.2, p.gold)}${circle(101, 128, 1.2, p.gold)}${line(77, 166, 88, 172, '#78918b', 0.8)}</g>
    <g id="neck">${path('M96 48L109 47L107 66L98 69Z', p.skin)}${path('M98 56L108 55L107 62L99 64Z', '#be8666')}</g>
    <g id="head">${path('M85 29Q91 15 105 17Q119 19 119 31L118 39L124 44L118 47L116 56Q109 62 98 56L88 46Z', p.skin)}${path('M84 44Q78 37 81 25Q82 14 92 13L97 8L102 12L109 10L115 16Q122 16 123 26L117 33L110 27L105 33L101 32L97 39L95 47L91 45Z', p.hair)}${path('M85 27Q90 16 104 17M100 17Q111 14 116 22', 'none', 'stroke="#87604a" stroke-width="1.2"')}${path('M91 38Q95 34 97 39L96 47Q92 49 90 44Z', p.skin)}${line(113, 36, 118, 35, '#5b463a', 1)}${frame === 6 && !walking ? line(114, 39, 117, 39, '#493c34', 0.8) : circle(116, 39, 0.9, '#3a3935')}${line(114, 51, 118, 50, '#8c604c', 0.8)}</g>
    <g id="scarf">${path('M90 58Q101 64 109 57L111 66Q101 72 89 66Z', p.red)}${rotate(walking ? -swing * 0.22 : 0, 93, 65, path('M93 63Q83 78 80 94L67 111L60 106Q72 90 79 68Z', p.red) + path('M82 71Q76 90 65 104', 'none', 'stroke="#a75c59" stroke-width="1.2"'))}</g>
    <g id="front-arm">${arm(-swing * 0.65, false)}</g>
  </g>`;
}
export function svg(
  body,
  width = 200,
  height = 256,
  p = PALETTES.original,
  scale = 1,
) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}" role="img">${defs(p)}${body}</svg>`;
}
