
import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Home } from './pages/home/home';
import { Plants } from './pages/plants/plants';
import { PlantDetails } from './pages/plant-details/plant-details';
import { MyPlants } from './pages/my-plants/my-plants';
import { CareSchedule } from './pages/care-schedule/care-schedule';
import { Profile } from './pages/profile/profile';
import { Admin } from './pages/admin/admin';

import { AdminCareTasks } from './pages/admin-care-tasks/admin-care-tasks';

import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: 'home',
    component: Home,
    canActivate: [authGuard]
  },
  {
    path: 'plants',
    component: Plants,
    canActivate: [authGuard]
  },
  {
    path: 'plants/:id',
    component: PlantDetails,
    canActivate: [authGuard]
  },
  {
    path: 'my-plants',
    component: MyPlants,
    canActivate: [authGuard]
  },
  {
    path: 'care-schedule',
    component: CareSchedule,
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    component: Admin,
    canActivate: [adminGuard]
  },
  {
    path: 'admin/care-tasks',
    component: AdminCareTasks,
    canActivate: [adminGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
