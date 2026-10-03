import {useState} from 'react';
import {NavLink,Navigate,Route,Routes,useNavigate} from 'react-router-dom';
import {BookOpen,CalendarDays,ChartNoAxesCombined,ClipboardList,House,Settings as SettingsIcon} from 'lucide-react';
import {FocusTimer} from '@/components/FocusTimer';
import {SetupWizard} from '@/components/SetupWizard';
import {useStore} from '@/store';
import {ChaptersPage} from '@/pages/ChaptersPage';
import {ErrorsPage} from '@/pages/ErrorsPage';
import {PlanPage} from '@/pages/PlanPage';
import {ReviewPage} from '@/pages/ReviewPage';
import {SettingsPage} from '@/pages/SettingsPage';
import {TodayPage} from '@/pages/TodayPage';

const navItems=[
 {label:'Today',path:'/today',Icon:House},
 {label:'Chapters',path:'/chapters',Icon:BookOpen},
 {label:'Plan',path:'/plan',Icon:CalendarDays},
 {label:'Errors',path:'/errors',Icon:ClipboardList},
 {label:'Review',path:'/review',Icon:ChartNoAxesCombined}
];
function AppShell(){
 const navigate=useNavigate(),setupDone=useStore(s=>s.setupDone),setupDismissed=useStore(s=>s.setupDismissed),[showSetup,setShowSetup]=useState(!setupDone&&!setupDismissed),[timer,setTimer]=useState<number|null>(null);
 const openSetup=()=>setShowSetup(true);
 return <div className="min-h-[100dvh]">
  <div className="mx-auto flex min-h-[100dvh] max-w-[1440px]">
   <aside className="hidden w-60 shrink-0 flex-col border-r-[3px] border-black bg-[#F5EACD] p-4 lg:flex">
    <div className="brut-sm bg-[var(--due)] p-4"><div className="display text-3xl">BLOCKS</div><p className="mono mt-1 text-xs font-bold">LESS APP. MORE ACTION.</p></div>
    <nav className="mt-6 space-y-2" aria-label="Primary navigation">{navItems.map(({label,path,Icon})=><NavLink key={path} to={path} className={({isActive})=>`brut-btn flex items-center gap-3 no-underline ${isActive?'is-done bg-[var(--due)]':'bg-white'}`} data-testid={`nav-${label.toLowerCase()}`}><Icon size={21} strokeWidth={3}/><span>{label}</span></NavLink>)}</nav>
    <div className="mt-auto border-t-[3px] border-black pt-4"><p className="mono text-xs">FIVE BLOCKS. ONE NEXT MOVE.</p><button className="brut-btn mt-3 w-full bg-white" onClick={()=>navigate('/settings')} data-testid="nav-settings"><SettingsIcon size={18} strokeWidth={3}/> SETTINGS</button></div>
   </aside>
   <div className="min-w-0 flex-1">
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b-[3px] border-black bg-[var(--paper)] px-4 lg:hidden">
     <NavLink to="/today" className="display text-2xl" data-testid="link-brand">BLOCKS<span className="mono ml-2 text-[10px]">STUDY / 01</span></NavLink>
     <NavLink to="/settings" aria-label="Settings" className="grid h-12 w-12 place-items-center border-[3px] border-black bg-white" data-testid="nav-settings-mobile"><SettingsIcon strokeWidth={3}/></NavLink>
    </header>
    <div className="hidden items-center justify-between border-b-[3px] border-black bg-[var(--paper)] px-8 py-3 lg:flex"><p className="mono text-xs font-bold">ISC CLASS 12 / YOUR PERSONAL STUDY TRACKER</p><NavLink to="/settings" className="brut-btn flex items-center gap-2 bg-white" data-testid="nav-settings-desktop"><SettingsIcon size={18} strokeWidth={3}/> SETTINGS</NavLink></div>
    <Routes>
     <Route path="/" element={<Navigate to="/today" replace/>}/>
     <Route path="/today" element={<TodayPage startFocus={setTimer} settings={()=>navigate('/settings')}/>}/>
     <Route path="/chapters" element={<ChaptersPage openSetup={openSetup}/>}/>
     <Route path="/plan" element={<PlanPage/>}/>
     <Route path="/errors" element={<ErrorsPage/>}/>
     <Route path="/review" element={<ReviewPage/>}/>
     <Route path="/settings" element={<SettingsPage openSetup={openSetup}/>}/>
     <Route path="*" element={<Navigate to="/today" replace/>}/>
    </Routes>
   </div>
  </div>
  <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t-[3px] border-black bg-[#F5EACD] p-2 pb-[max(8px,env(safe-area-inset-bottom))] lg:hidden" aria-label="Primary navigation">
   {navItems.map(({label,path,Icon})=><NavLink key={path} to={path} className={({isActive})=>`flex min-h-[58px] flex-col items-center justify-center gap-1 border-[3px] border-black text-[10px] font-bold uppercase ${isActive?'is-done bg-[var(--due)]':'bg-white'}`} data-testid={`nav-${label.toLowerCase()}-mobile`}><Icon size={20} strokeWidth={3}/>{label}</NavLink>)}
  </nav>
  {showSetup&&<SetupWizard close={()=>setShowSetup(false)}/>}
  {timer!==null&&<FocusTimer key={timer} initial={timer} close={()=>setTimer(null)}/>}
 </div>
}
function App(){return <AppShell/>}
export default App;