// agenda-routing.ts
const routes: Routes = [
  { path: '', component: AgendaListComponent },
  { path: 'calendario', component: AgendaCalendarComponent },
  { path: 'nueva', component: CirugiaFormComponent },
  { path: 'editar/:id', component: CirugiaFormComponent },
  { path: 'detalle/:id', component: CirugiaDetailComponent },
  { path: 'tecnicos', component: DisponibilidadTecnicosComponent },
  { path: 'seguimiento/:id', component: SeguimientoCirugiaComponent }
];