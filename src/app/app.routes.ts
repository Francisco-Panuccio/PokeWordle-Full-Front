import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ErrorComponent } from './pages/error/error.component';
import { PlayComponent } from './pages/play/play.component';
import { regionalUnlockedGuard } from './guards/regional-unlocked.guard';

export const routes: Routes = [
    {
        path: 'home', component: HomeComponent,
        title: 'PokeWordle'
    },
    {
        path: 'play', component: PlayComponent,
        title: 'PokeWordle'
    },
    {
        path: 'progress', redirectTo: 'competitive',
        pathMatch: 'full'
    },
    {
        path: 'competitive', loadComponent: () => import('./pages/competitive-menu/competitive-menu.component').then((file) => file.CompetitiveMenuComponent),
        title: 'Competitive Menu'
    },
    {
        path: 'tournament', loadComponent: () => import('./pages/tournament-wordle/tournament-wordle.component').then((file) => file.TournamentWordleComponent),
        title: 'Tournament'
    },
    {
        path: 'progress/region/:region', loadComponent: () => import('./pages/competitive-wordle/competitive-wordle.component').then((file) => file.CompetitiveWordleComponent),
        canActivate: [regionalUnlockedGuard],
        title: 'PokeWordle'
    },
    {
        path: 'error', component: ErrorComponent,
        title: 'Error'
    },
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: '**',
        component: ErrorComponent
    }
];