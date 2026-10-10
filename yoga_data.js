// Yoga: información de cada postura (puntos clave numerados, error común, versión fácil),
// estilos y secuencias. Textos propios basados en libros de referencia (ver REFS).
'use strict';
Object.assign(window.REFS, {
  iyengar1966: 'Iyengar BKS. Light on Yoga. New York: Schocken Books; 1966.',
  kaminoff2012: 'Kaminoff L, Matthews A. Yoga Anatomy. 2nd ed. Champaign (IL): Human Kinetics; 2012.',
  stephens2012: 'Stephens M. Yoga Sequencing: Designing Transformative Yoga Classes. Berkeley: North Atlantic Books; 2012.',
  clark2012: 'Clark B. The Complete Guide to Yin Yoga. Ashland (OR): White Cloud Press; 2012.'
});

// level: 1 principiante, 2 intermedio, 3 avanzado. cues: en el orden de los números sobre la figura.
window.YPI = {
  montana: {es:'Montaña', en:'Mountain Pose', sa:'Tadasana', sides:false, level:1, hold:'5 respiraciones',
    cues:['Pies paralelos, peso repartido entre talones y dedos','Rodillas estiradas sin trabarlas','Pelvis neutra, abdomen suave','Coronilla hacia arriba, mentón paralelo al piso'],
    err:'Trabar las rodillas o tirar los hombros hacia atrás de golpe.', easy:['Pies más separados para tener más estabilidad']},
  brazos_arriba: {es:'Saludo hacia arriba', en:'Upward Salute', sa:'Urdhva Hastasana', sides:false, level:1, hold:'3 respiraciones',
    cues:['Brazos estirados, palmas enfrentadas','Hombros lejos de las orejas','Costillas abajo, sin arquear la zona lumbar','Pies firmes en el piso'],
    err:'Arquear la espalda baja para subir más los brazos.', easy:['Brazos en V si los hombros están tensos']},
  pinza_pie: {es:'Pinza de pie', en:'Standing Forward Fold', sa:'Uttanasana', sides:false, level:1, hold:'5 respiraciones',
    cues:['Doblate desde la cadera, no desde la cintura','Rodillas sin trabar; doblalas si tira la espalda','Manos al piso o a las canillas','Cuello suelto, cabeza colgando'],
    err:'Redondear la espalda con las piernas trabadas para llegar al piso.', easy:['Rodillas dobladas, panza cerca de los muslos']},
  medio_levantamiento: {es:'Medio levantamiento', en:'Half Forward Fold', sa:'Ardha Uttanasana', sides:false, level:1, hold:'1–3 respiraciones',
    cues:['Cadera atrás, sobre los talones','Espalda plana, pecho hacia adelante','Manos en las canillas','Cuello largo, mirada al piso un poco adelante'],
    err:'Levantar la cabeza y doblar el cuello hacia atrás.', easy:['Rodillas dobladas y manos sobre los muslos']},
  silla: {es:'Silla', en:'Chair Pose', sa:'Utkatasana', sides:false, level:1, hold:'5 respiraciones',
    cues:['Rodillas detrás de las puntas de los pies','Cadera atrás, como para sentarte','Brazos en línea con el torso','Peso en los talones'],
    err:'Llevar las rodillas muy adelante y despegar los talones.', easy:['Doblá menos las rodillas y llevá las manos al pecho']},
  guerrero1: {es:'Guerrero I', en:'Warrior I', sa:'Virabhadrasana I', sides:true, level:1, hold:'5 respiraciones por lado',
    cues:['Rodilla de adelante sobre el tobillo','Pierna de atrás firme, talón apoyado, pie a 45°','Cadera mirando al frente','Brazos arriba sin subir los hombros'],
    err:'Que la rodilla de adelante se vaya hacia adentro.', easy:['Paso más corto y rodilla menos doblada']},
  guerrero2: {es:'Guerrero II', en:'Warrior II', sa:'Virabhadrasana II', sides:true, level:1, hold:'5 respiraciones por lado',
    cues:['Rodilla de adelante justo sobre el tobillo, apuntando al pie','Pierna de atrás firme y estirada','Brazos a la altura de los hombros, palmas hacia abajo','Torso vertical sobre la cadera, mirada sobre la mano de adelante'],
    err:'Inclinar el torso hacia adelante o dejar que la rodilla pase la punta del pie.', easy:['Rodilla sobre el tobillo, aunque doble menos']},
  angulo_lateral: {es:'Ángulo lateral extendido', en:'Extended Side Angle', sa:'Utthita Parsvakonasana', sides:true, level:2, hold:'5 respiraciones por lado',
    cues:['Rodilla de adelante sobre el tobillo','Brazo de arriba sobre la oreja, palma hacia abajo','Costado largo, sin colapsar sobre la pierna','Línea recta del pie de atrás a la mano'],
    err:'Cargar todo el peso en la mano de abajo y hundir el pecho.', easy:['Antebrazo apoyado en el muslo, sin cargar peso']},
  triangulo: {es:'Triángulo', en:'Triangle Pose', sa:'Trikonasana', sides:true, level:1, hold:'5 respiraciones por lado',
    cues:['Las dos piernas estiradas, sin trabar las rodillas','Brazos en una sola línea vertical, palmas hacia adelante','Torso largo hacia el costado, pecho mirando al frente (no al piso)','Pierna de atrás firme, borde del pie apoyado'],
    err:'Apoyar la mano sobre la rodilla (cargás la articulación) o girar el pecho hacia el piso.', easy:['El bloque te deja mantener el torso largo']},
  piramide: {es:'Pirámide', en:'Pyramid Pose', sa:'Parsvottanasana', sides:true, level:2, hold:'5 respiraciones por lado',
    cues:['Pierna de adelante estirada sin trabar','Cadera pareja, mirando al frente','Bajá desde la cadera con la espalda larga','Pierna de atrás firme, pie a 45°'],
    err:'Redondear la espalda para acercar la cabeza a la rodilla.', easy:['Manos en bloques y espalda plana']},
  arbol: {es:'Árbol', en:'Tree Pose', sa:'Vrksasana', sides:true, level:1, hold:'5 respiraciones por lado',
    cues:['Pie en la parte interna del muslo o la pantorrilla, nunca sobre la rodilla','Rodilla hacia afuera sin girar la cadera','Cadera pareja sobre la pierna de apoyo','Mirá un punto fijo; brazos arriba o manos al pecho'],
    err:'Apoyar el pie sobre la rodilla o sacar la cadera hacia el costado.', easy:['Talón en el tobillo y dedos en el piso']},
  bailarin: {es:'Bailarín (preparación)', en:"Dancer's Pose prep", sa:'Natarajasana', sides:true, level:2, hold:'3–5 respiraciones por lado',
    cues:['Pierna de apoyo firme, rodilla sin trabar','Rodilla apuntando al piso; empujá el pie contra la mano','Pecho abierto al inclinarte','Brazo adelante y mirada fija'],
    err:'Abrir la rodilla hacia el costado y girar la cadera.', easy:['Tomá el pie con el torso derecho, rodillas juntas']},
  gato_vaca: {es:'Gato-vaca', en:'Cat-Cow', sa:'Marjaryasana-Bitilasana', sides:false, level:1, hold:'6–8 ciclos con la respiración',
    cues:['Movimiento desde la pelvis, vértebra por vértebra','El cuello sigue a la columna','Manos bajo los hombros, dedos abiertos','Rodillas bajo la cadera'],
    err:'Mover solo la cabeza y los hombros, sin la pelvis.', easy:['Rango chico, sin forzar']},
  perro_abajo: {es:'Perro boca abajo', en:'Downward-Facing Dog', sa:'Adho Mukha Svanasana', sides:false, level:1, hold:'5 respiraciones',
    cues:['Cadera alta: espalda larga, en línea de las manos a la cadera','Brazos estirados, manos a lo ancho de los hombros, palmas apoyadas','Rodillas estiradas sin trabarlas','Talones hacia el piso (no hace falta que toquen)'],
    err:'Redondear la espalda por estirar las piernas a la fuerza.', easy:['Rodillas dobladas todo lo que haga falta','Talones despegados']},
  plancha: {es:'Plancha', en:'Plank Pose', sa:'Phalakasana', sides:false, level:1, hold:'15–30 segundos',
    cues:['Hombros sobre las muñecas','Cadera alineada: ni arriba ni hundida','Talones empujando atrás, piernas activas','Manos abiertas empujando el piso'],
    err:'Hundir la cadera y cargar la zona lumbar.', easy:['Rodillas apoyadas, línea de rodillas a cabeza']},
  chaturanga: {es:'Plancha baja', en:'Four-Limbed Staff', sa:'Chaturanga Dandasana', sides:false, level:3, hold:'1–3 respiraciones',
    cues:['Codos atrás, pegados al cuerpo, a 90°','Hombros no más bajos que los codos','Cuerpo en bloque, abdomen firme','Talones atrás'],
    err:'Bajar los hombros por debajo de los codos (sobrecarga el hombro).', easy:['Bajá con las rodillas en el piso']},
  perro_arriba: {es:'Perro boca arriba', en:'Upward-Facing Dog', sa:'Urdhva Mukha Svanasana', sides:false, level:2, hold:'1–3 respiraciones',
    cues:['Hombros lejos de las orejas, sobre las muñecas','Brazos estirados','Muslos despegados del piso, empeines apoyados','Cuello largo, mirada adelante'],
    err:'Colgarse de los hombros y apretar la zona lumbar.', easy:['Piernas apoyadas y codos pegados (cobra baja)']},
  cobra: {es:'Cobra', en:'Cobra Pose', sa:'Bhujangasana', sides:false, level:1, hold:'3–5 respiraciones',
    cues:['Codos pegados al cuerpo, apuntando atrás y un poco doblados','Hombros lejos de las orejas, pecho abierto','Piernas, empeines y pubis apoyados','Cuello largo, mirada al frente'],
    err:'Estirar los brazos de golpe y apretar la zona lumbar.', easy:['Codos justo debajo de los hombros']},
  esfinge: {es:'Esfinge', en:'Sphinx Pose', sa:'Salamba Bhujangasana', sides:false, level:1, hold:'1–3 minutos (yin)',
    cues:['Codos debajo de los hombros','Hombros lejos de las orejas','Abdomen y zona lumbar relajados, sin dolor','Cuello largo'],
    err:'Sostenerla con dolor lumbar: bajá o adelantá los codos.', easy:['Pecho sobre un almohadón y codos más adelante']},
  langosta: {es:'Langosta (media)', en:'Half Locust', sa:'Ardha Salabhasana', sides:true, level:1, hold:'3–5 respiraciones por lado',
    cues:['Pierna estirada, empeine largo','Rodilla estirada sin girar la pierna','Cadera apoyada pareja','Cuello largo, mirada al piso adelante'],
    err:'Girar la cadera para subir más la pierna.', easy:['Levantá poco, con la cadera apoyada']},
  estocada_baja: {es:'Estocada baja', en:'Low Lunge', sa:'Anjaneyasana', sides:true, level:1, hold:'5 respiraciones por lado',
    cues:['Rodilla de adelante sobre o detrás del tobillo','Rodilla de atrás acolchada','Cadera adelante y abajo, abdomen firme','Brazos arriba, hombros bajos'],
    err:'Arquear la zona lumbar en vez de estirar el flexor de cadera.', easy:['Acolchá la rodilla y apoyá las manos en el muslo']},
  mejor_estiramiento: {es:'Estocada con rotación', en:"World's Greatest Stretch", sa:'—', sides:true, level:1, hold:'3–5 respiraciones por lado',
    cues:['Brazo de arriba en línea con el de abajo','Girá el pecho, no solo el brazo','Rodilla de adelante estable','Rodilla de atrás apoyada'],
    err:'Girar solo el hombro sin rotar la columna.', easy:['Girá menos, con la mano en la cintura']},
  paloma: {es:'Paloma', en:'Pigeon Pose', sa:'Eka Pada Rajakapotasana (prep.)', sides:true, level:2, hold:'1–3 minutos por lado',
    cues:['Rodilla de adelante apoyada, alineada con la cadera','Pie flexionado para cuidar la rodilla','Pierna de atrás estirada, rodilla mirando al piso','Cadera pareja y pecho alto'],
    err:'Sentir dolor en la rodilla de adelante: subí la cadera o hacé la versión fácil.', easy:['Almohadón bajo la cadera de la pierna de adelante']},
  balasana: {es:'Postura del niño', en:"Child's Pose", sa:'Balasana', sides:false, level:1, hold:'1–3 minutos',
    cues:['Cadera hacia los talones','Brazos adelante, relajados','Frente apoyada, cuello suelto','Rodillas separadas, dedos gordos juntos'],
    err:'Forzar la cadera a los talones con dolor de rodilla.', easy:['Almohadón bajo el pecho o la frente']},
  pinza_sentada: {es:'Pinza sentada', en:'Seated Forward Fold', sa:'Paschimottanasana', sides:false, level:1, hold:'5 respiraciones (yin: 3–5 min)',
    cues:['Inclinate desde la cadera','Espalda larga antes de bajar','Rodillas sin trabar','Pies flexionados'],
    err:'Tirar con los brazos y redondear la espalda.', easy:['Rodillas dobladas sobre un almohadón']},
  angulo_abierto: {es:'Ángulo abierto sentado', en:'Wide-Angle Seated Forward Bend', sa:'Upavistha Konasana', sides:false, level:1, hold:'5 respiraciones (yin: 3–5 min)',
    cues:['Sentate sobre los isquiones','Rodillas mirando al techo','Caminá con las manos sin forzar','Llevá el pecho adelante, no la cabeza'],
    err:'Dejar que las rodillas giren hacia adentro.', easy:['Sentate sobre un almohadón']},
  mariposa: {es:'Mariposa', en:'Bound Angle', sa:'Baddha Konasana', sides:false, level:1, hold:'5 respiraciones (yin: 3–5 min)',
    cues:['Plantas juntas','Rodillas caen solas, sin empujarlas','Sentate erguido sobre los isquiones','Coronilla hacia arriba'],
    err:'Empujar las rodillas al piso con las manos.', easy:['Sentate sobre un almohadón']},
  sentado_facil: {es:'Sentado fácil', en:'Easy Pose', sa:'Sukhasana', sides:false, level:1, hold:'1–5 minutos',
    cues:['Cadera más alta que las rodillas si hace falta','Hombros relajados','Coronilla arriba, mentón suave','Piernas cruzadas cómodas'],
    err:'Encorvarte: si pasa, sentate más alto.', easy:['Almohadón bajo la cadera']},
  savasana: {es:'Relajación final', en:'Corpse Pose', sa:'Savasana', sides:false, level:1, hold:'3–10 minutos',
    cues:['Pies caen hacia afuera','Palmas hacia arriba','Hombros sueltos','Ojos cerrados, respiración natural'],
    err:'Saltearla: es la parte que ayuda a bajar revoluciones.', easy:['Almohadón bajo las rodillas']},
  rodillas_pecho: {es:'Rodillas al pecho', en:'Knees-to-Chest', sa:'Apanasana', sides:false, level:1, hold:'5–10 respiraciones',
    cues:['Rodillas al pecho sin tensión','Zona lumbar apoyada','Hombros en el piso','Cabeza apoyada'],
    err:'Levantar la cabeza y tensar el cuello.', easy:['Una rodilla por vez']},
  isquio_supino: {es:'Estiramiento de isquios acostado', en:'Reclining Hand-to-Big-Toe', sa:'Supta Padangusthasana', sides:true, level:1, hold:'5–10 respiraciones por lado',
    cues:['Pie flexionado en la correa','Rodilla estirada sin trabar','Pierna de abajo larga, empujando el talón','Hombros apoyados y relajados'],
    err:'Tirar tanto que se despegue la cadera del piso.', easy:['Rodilla de abajo doblada, pie apoyado']},
  puente: {es:'Puente', en:'Bridge Pose', sa:'Setu Bandha Sarvangasana', sides:false, level:1, hold:'5 respiraciones',
    cues:['Subí la cadera empujando con los talones','Rodillas paralelas, sobre los tobillos','Pies paralelos a lo ancho de la cadera','No gires la cabeza: cuello libre'],
    err:'Abrir las rodillas o girar la cabeza estando arriba.', easy:['Bloque bajo el sacro']},
  torsion_supina: {es:'Torsión acostado', en:'Supine Twist', sa:'Supta Matsyendrasana', sides:true, level:1, hold:'5–10 respiraciones por lado',
    cues:['Rodillas juntas hacia un lado','Hombro opuesto apoyado','Brazos en cruz, palmas arriba','Mirá hacia el lado contrario'],
    err:'Forzar las rodillas al piso despegando el hombro.', easy:['Rodillas sobre un almohadón']},
  mariposa_reclinada: {es:'Mariposa reclinada', en:'Reclining Bound Angle', sa:'Supta Baddha Konasana', sides:false, level:1, hold:'3–5 minutos',
    cues:['Plantas juntas','Rodillas abiertas sin forzar','Brazos abiertos, palmas arriba','Zona lumbar cómoda'],
    err:'Sostenerla con tirón en la ingle: poné apoyos bajo las rodillas.', easy:['Almohadones bajo cada rodilla']},
  piernas_pared: {es:'Piernas en la pared', en:'Legs Up the Wall', sa:'Viparita Karani', sides:false, level:1, hold:'3–10 minutos',
    cues:['Piernas relajadas contra la pared','Cadera cerca de la pared','Hombros sueltos','Respiración lenta'],
    err:'Tensar las piernas para sostenerlas.', easy:['Alejate un poco y doblá las rodillas']},
};
['guerrero2','triangulo','perro_abajo','cobra'].forEach(k => { YPI[k].ref = ['iyengar1966','kaminoff2012']; });
Object.keys(YPI).forEach(k => { if (!YPI[k].ref) YPI[k].ref = ['iyengar1966','kaminoff2012']; });
['esfinge','mariposa_reclinada','paloma','pinza_sentada','angulo_abierto','mariposa','balasana'].forEach(k => YPI[k].ref.push('clark2012'));

// Postura vieja → se reemplaza la ficha manteniendo el id (los historiales y secuencias siguen funcionando).
YOGA.poses = Object.entries(YPI).map(([id, v]) => ({id, es: v.es, en: v.en, sa: v.sa, sides: v.sides, cues: v.cues, img: []}));
Object.keys(YP).forEach(k => delete YP[k]);
YOGA.poses.forEach(p => { YP[p.id] = p; });

// ---------- estilos ----------
window.YSTYLE_INFO = {
  hatha: {name:'Hatha', level:1, desc:'Posturas una por una, sostenidas de 3 a 6 respiraciones con pausas. Es el mejor estilo para aprender bien cada postura.', hold:'3–6 respiraciones'},
  vinyasa: {name:'Vinyasa', level:2, desc:'Fluido: cada movimiento va con una inhalación o una exhalación y las posturas se enlazan. Más dinámico, sube el pulso.', hold:'1 respiración por movimiento'},
  yin: {name:'Yin', level:1, desc:'Posturas pasivas en el piso, sostenidas de 2 a 5 minutos con los músculos relajados. Ideal después de piernas o de correr.', hold:'2–5 minutos'},
  restaurativo: {name:'Restaurativo', level:1, desc:'Posturas con almohadones y mantas, casi sin esfuerzo. Para bajar el estrés o antes de dormir.', hold:'3–10 minutos'},
  power: {name:'Power yoga', level:3, desc:'Vinyasa con más fuerza: planchas, equilibrios y posturas de pie sostenidas.', hold:'Flujo + sostenes de 30–45 s'},
  movilidad: {name:'Movilidad', level:1, desc:'Rutinas cortas para corredores, ciclistas y gimnasio: caderas, isquios, espalda y hombros.', hold:'30–60 segundos'},
};
Object.assign(YSTYLES, {power:'Power', movilidad:'Movilidad'});
const LEVEL_TXT = ['', 'Principiante', 'Intermedio', 'Avanzado'];

// ---------- secuencias ----------
const seqStyle = {post_piernas:'movilidad', manana:'hatha', cardio:'movilidad', espalda:'movilidad', dormir:'restaurativo', fuerza_yoga:'hatha'};
YOGA.seqs.forEach(s => { s.style = s.style || seqStyle[s.id] || 'hatha'; });
// Saludo al sol A: una respiración por movimiento (in = inhalá, ex = exhalá).
const SOL_A = [['montana',4,'in'],['brazos_arriba',4,'in'],['pinza_pie',4,'ex'],['medio_levantamiento',4,'in'],['plancha',5,'ex'],['chaturanga',4,'ex'],['perro_arriba',4,'in'],['perro_abajo',25,'ex'],['medio_levantamiento',4,'in'],['pinza_pie',4,'ex'],['brazos_arriba',4,'in'],['montana',4,'ex']];
const SOL_A_FACIL = SOL_A.map(([p,s,b]) => p === 'chaturanga' || p === 'plancha' || p === 'perro_arriba' ? [p,s,b,'easy'] : [p,s,b]);
const st = arr => arr.map(([p,s,b,v]) => Object.assign({p, s}, b ? {br: b} : {}, v ? {v} : {}));
YOGA.seqs.push(
  {id:'hatha_base', style:'hatha', name:'Hatha para principiantes', desc:'Las posturas de base, sostenidas y con tiempo para acomodarte.',
    steps: st([['sentado_facil',60],['gato_vaca',45],['perro_abajo',40],['montana',30],['brazos_arriba',20],['pinza_pie',40],['guerrero1',35],['guerrero2',35],['triangulo',35],['arbol',30],['mariposa',60],['pinza_sentada',60],['puente',40],['torsion_supina',45],['savasana',180]])},
  {id:'vinyasa_sol', style:'vinyasa', name:'Saludos al sol y flujo de pie', desc:'Tres saludos al sol A y un flujo de guerreros. Una respiración por movimiento.',
    steps: st([...SOL_A_FACIL, ...SOL_A, ...SOL_A, ['guerrero1',20,'in'],['guerrero2',20,'ex'],['angulo_lateral',20,'in'],['triangulo',20,'ex'],['perro_abajo',30],['balasana',60],['savasana',150]])},
  {id:'yin_caderas', style:'yin', name:'Yin para caderas y espalda', desc:'Posturas largas y pasivas en el piso. Respirá lento y quedate quieto.',
    steps: st([['mariposa',240],['paloma',180],['esfinge',180],['pinza_sentada',240],['torsion_supina',120],['savasana',240]])},
  {id:'restaurativo', style:'restaurativo', name:'Restaurativo con apoyos', desc:'Con almohadones bajo el cuerpo. Para un día de mucho estrés o antes de dormir.',
    steps: st([['balasana',180,null,'easy'],['mariposa_reclinada',300,null,'easy'],['piernas_pared',300],['torsion_supina',120,null,'easy'],['savasana',300,null,'easy']])},
  {id:'power', style:'power', name:'Power yoga 25 min', desc:'Saludos al sol, posturas de fuerza y equilibrio. Exigente: calentá antes.',
    steps: st([...SOL_A, ...SOL_A, ['silla',30],['guerrero1',30],['guerrero2',30],['angulo_lateral',30],['arbol',30],['plancha',45],['chaturanga',8,'ex'],['perro_arriba',6,'in'],['perro_abajo',30],['langosta',25],['puente',45],['rodillas_pecho',40],['savasana',150]])},
  {id:'movilidad_corredor', style:'movilidad', name:'Movilidad para corredores', desc:'Flexores de cadera, isquios, gemelos y cadera, en 12 minutos.',
    steps: st([['perro_abajo',45],['estocada_baja',40],['mejor_estiramiento',30],['piramide',35],['paloma',60],['isquio_supino',45],['torsion_supina',40],['savasana',60]])}
);
