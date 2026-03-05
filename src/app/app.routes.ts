import { Routes } from '@angular/router';
import {AnalyzerPage} from './pages/analyzer.page';
import {ContactPage} from './pages/contact.page';
import {LegalNoticePage} from './pages/legal-notice.page';
import {PrivacyPage} from './pages/privacy.page';

export const routes: Routes = [
  { path: '', component: AnalyzerPage, title: 'Bridge Hand Analysis' },
  { path: 'contact', component: ContactPage, title: 'Contact' },
  { path: 'legal-notice', component: LegalNoticePage, title: 'Legal Notice (Impressum)' },
  { path: 'privacy', component: PrivacyPage, title: 'Data Privacy Statement' },
  { path: '**', redirectTo: '' },
];
