// Route Constants
// This file contains all application route definitions

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RESEARCH: '/research',
  GENERATE: '/generate',
  BUILDER: '/builder',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = typeof ROUTES[RouteKey];