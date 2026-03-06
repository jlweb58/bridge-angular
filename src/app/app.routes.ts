import { Routes } from '@angular/router';
import {AnalyzerPage} from './pages/analyzer.page';
import {ContactPage} from './pages/contact.page';
import {PrivacyPage} from './pages/privacy.page';
import {AboutPage} from './pages/about.page';

export const routes: Routes = [
  { path: '', component: AnalyzerPage, title: 'Bridge Hand Analysis' },
  { path: 'contact', component: ContactPage, title: 'Contact &amp; Legal' },
  { path: 'privacy', component: PrivacyPage, title: 'Data Privacy Statement' },
  { path: 'about', component: AboutPage, title: 'About' },
  { path: '**', redirectTo: '' },
];
