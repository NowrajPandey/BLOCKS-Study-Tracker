import type {BlockId,ScoreEntry,SubjectId} from './types';
export const SUBJECTS:Record<SubjectId,{label:string;color:string}>={
 maths:{label:'MATHS',color:'var(--maths)'},physics:{label:'PHYSICS',color:'var(--physics)'},chemistry:{label:'CHEMISTRY',color:'var(--chemistry)'},biology:{label:'BIOLOGY',color:'var(--biology)'},english:{label:'ENGLISH',color:'var(--english)'}
};
export const SUBJECT_ORDER:SubjectId[]=['maths','physics','chemistry','biology','english'];
export const CORE_SUBJECTS:SubjectId[]=['physics','chemistry','maths','biology'];
export const SUBJECT_WEIGHT={maths:1,physics:.9,chemistry:.5,biology:.3,english:.3};
export const BLOCK_TIMES:Record<BlockId,{weekday:string;length:string}>={A:{weekday:'Before school · about 5:30',length:'75 min'},B:{weekday:'After rest · about 2:30',length:'2 h'},C:{weekday:'Evening · about 6:30',length:'75 min'}};
export interface BlockPlan {subject:SubjectId|'mixed'|'flex'|'test';focus:string}
export const WEEK_TEMPLATE:Record<number,Record<BlockId,BlockPlan>>={
1:{A:{subject:'maths',focus:'New topic or practice'},B:{subject:'physics',focus:'New chapter + numericals'},C:{subject:'chemistry',focus:'Revision queue'}},
 2:{A:{subject:'maths',focus:'New topic or practice'},B:{subject:'chemistry',focus:'Numericals + organic'},C:{subject:'biology',focus:'Diagrams + active recall'}},
3:{A:{subject:'maths',focus:'New topic or practice'},B:{subject:'physics',focus:'New chapter + numericals'},C:{subject:'biology',focus:'Revision queue'}},
4:{A:{subject:'maths',focus:'New topic or practice'},B:{subject:'mixed',focus:'Chemistry 1 h + Biology 1 h'},C:{subject:'physics',focus:'Derivations + old chapters'}},
5:{A:{subject:'maths',focus:'New topic or practice'},B:{subject:'physics',focus:'PYQs + numericals'},C:{subject:'flex',focus:'FLEX: whatever is behind or due. Your buffer.'}},
6:{A:{subject:'maths',focus:'2.5 h: practice + PYQs'},B:{subject:'physics',focus:'2 h: PYQs'},C:{subject:'mixed',focus:'Chem + Bio 2 h. Clear the R3s.'}},
 0:{A:{subject:'test',focus:'Timed test, 3 h'},B:{subject:'mixed',focus:'Error analysis + fixes'},C:{subject:'english',focus:'Weekly review + English. Afternoon off.'}}
};
export const PHASES=[
{id:0,name:'Setup',job:'Confirm exam dates. Add every finished chapter to the tracker.'},
{id:1,name:'Catch up and build',job:'Finish pending Maths. Get Physics ahead of school. First revision pass of finished chapters.'},
{id:2,name:'Practical sprint',job:'Practical files, viva, Saturday mock practicals. Theory on a lighter load. R2 of everything.'},
{id:3,name:'Pre-board mode',job:'Full-syllabus round 2. Timed full papers every weekend. Error log cleanup.'},
{id:4,name:'Pre-boards, then boards',job:'Between papers revise only the next paper. After results, plan the boards.'}
];
export const WEEK_MILESTONES:{week:number;start:string;end:string;items:string[]}[]=[
{week:1,start:'2026-10-05',end:'2026-10-11',items:['Maths: finish ITF + definite integrals','Physics: match school pace, R1 Current Electricity','Chemistry: R1 Solutions','English: finish Macbeth Act 5','Start the error log']},
{week:2,start:'2026-10-12',end:'2026-10-18',items:['Maths: PYQs on ITF + definite integrals','Physics: next new chapter (1 ahead of school)','Chemistry: R1 Electrochemistry','Biology: R1 first set of chapters']},
{week:3,start:'2026-10-19',end:'2026-10-25',items:['Maths: topic PYQs on finished chapters','Maths chapter test (aim 70%+)','Physics: 2 chapters ahead of school','Chemistry: R1 organic','Biology: R1 till evolution','English: R1 poems + stories']},
{week:4,start:'2026-10-26',end:'2026-11-01',items:['Maths: mixed PYQ sets + fix error log themes','Physics: new chapters + numericals','Practicals begin: 30 min a day','R2 passes start','Checkpoint: 20 min plan reset']},
{week:5,start:'2026-11-02',end:'2026-11-08',items:['Maths project done','Practical write-ups + viva','All practical files done','Mock practical on Saturday']},
{week:6,start:'2026-11-09',end:'2026-11-15',items:['Daily Maths block (60 min), light theory','Practical rehearsals + last viva run','Practical week: run the mocks, sleep well']},
{week:7,start:'2026-11-16',end:'2026-11-22',items:['Round 2: weakest 5 chapters in Maths + Physics','Timed Maths paper','Timed Physics paper','R3s due','Cheat sheets: Chem + Bio']},
{week:8,start:'2026-11-23',end:'2026-11-29',items:['Final error log cleanup','Second full Maths paper','Timed Chemistry','Timed Biology + English','Light day: formulas only, sleep early']}
];
export const STARTER_CHAPTERS:Record<SubjectId,{name:string;finished:boolean}[]>={
physics:[['Electrostatics',true],['Current Electricity',true],['Magnetic Effects of Current and Magnetism',false],['Electromagnetic Induction and Alternating Current',false],['Electromagnetic Waves',false],['Ray Optics and Optical Instruments',false],['Wave Optics',false],['Dual Nature of Radiation and Matter',false],['Atoms and Nuclei',false],['Electronic Devices',false]].map(([name,finished])=>({name:String(name),finished:Boolean(finished)})),
chemistry:[['Solutions',true],['Electrochemistry',true],['Chemical Kinetics',true],['Haloalkanes and Haloarenes',true],['Alcohols, Phenols and Ethers',true],['Aldehydes, Ketones and Carboxylic Acids',true],['Amines (organic compounds containing nitrogen)',true],['Coordination Compounds',false],['d- and f-Block Elements',false],['p-Block Elements',false],['Biomolecules',false]].map(([name,finished])=>({name:String(name),finished:Boolean(finished)})),
maths:[['Relations and Functions',true],['Matrices and Determinants',true],['Continuity and Differentiability',true],['Applications of Derivatives',true],['Indefinite Integrals',true],['Application of Integrals',false],['Differential Equations',false],['Vectors and 3D Geometry',false],['Probability (conditional probability, Bayes)',false],['Linear Programming',false]].map(([name,finished])=>({name:String(name),finished:Boolean(finished)})),
biology:[['Reproduction in Organisms',true],['Sexual Reproduction in Flowering Plants',true],['Human Reproduction and Reproductive Health',true],['Principles of Inheritance and Variation (genetics, linkage, crossing over, disorders)',true],['Molecular Basis of Inheritance',true],['Evolution',true],['Human Health and Disease',false],['Biotechnology',false],['Ecology',false]].map(([name,finished])=>({name:String(name),finished:Boolean(finished)})),
english:[['Literature: Macbeth Acts 1-4',true],['Literature: Short stories',true],['Literature: Poems',true],['Language: Composition (essay, letter, notice)',true],['Language: Grammar and comprehension',true]].map(([name,finished])=>({name:String(name),finished:Boolean(finished)}))
};
export const LEGACY_SEED_PENDING_IDS=['p-maths-itf','p-maths-defint','p-eng-macbeth5'];
export const SEED_SCORES:Omit<ScoreEntry,'id'>[]=[
{label:'Unit test',subject:'chemistry',type:'unit',obtained:20,total:20},
{label:'Unit test',subject:'biology',type:'unit',obtained:20,total:20},
{label:'Unit test',subject:'physics',type:'unit',obtained:16,total:20},
{label:'Unit test',subject:'maths',type:'unit',obtained:9,total:20},
{label:'Unit test (English 1, Language)',subject:'english',paper:'language',type:'unit',obtained:19,total:20},
{label:'Unit test (English 2, Literature)',subject:'english',paper:'literature',type:'unit',obtained:15,total:20,note:'Teacher sets a very hard paper. Highest scorer in the class.'}
];
export const HALF_YEARLY_NOTES=[{subject:'Biology',verdict:'Very good'},{subject:'English',verdict:'Very good (both papers)'},{subject:'Chemistry',verdict:'A little bad. Did not revise.'},{subject:'Maths',verdict:'Bad'},{subject:'Physics',verdict:'Bad'}];
export const PRACTICAL_STARTER=[
{id:'phy-file',subject:'physics' as const,text:'Practical file complete and signed'},{id:'phy-exps',subject:'physics' as const,text:'Every experiment written up (aim, apparatus, observations, result)'},{id:'phy-viva',subject:'physics' as const,text:'Viva questions revised for each experiment'},{id:'phy-mock',subject:'physics' as const,text:'Full mock practical done (Saturday run)'},
{id:'chem-file',subject:'chemistry' as const,text:'Practical file complete and signed'},{id:'chem-vol',subject:'chemistry' as const,text:'Volumetric analysis practised (including redox titration calculations)'},{id:'chem-salt',subject:'chemistry' as const,text:'Salt analysis practised'},{id:'chem-org',subject:'chemistry' as const,text:'Organic tests practised'},{id:'chem-viva',subject:'chemistry' as const,text:'Viva questions revised'},{id:'chem-mock',subject:'chemistry' as const,text:'Full mock practical done (Saturday run)'},
{id:'bio-file',subject:'biology' as const,text:'Practical file complete and signed'},{id:'bio-spot',subject:'biology' as const,text:'Spotters and slides revised'},{id:'bio-diag',subject:'biology' as const,text:'Diagrams redrawn from memory'},{id:'bio-viva',subject:'biology' as const,text:'Viva questions revised'},{id:'bio-mock',subject:'biology' as const,text:'Full mock practical done (Saturday run)'},
{id:'math-proj',subject:'maths' as const,text:'Maths project finished (conditional probability, Bayes theorem, transportation problem)'},{id:'math-proj2',subject:'maths' as const,text:'Project reviewed and ready to submit'}
];