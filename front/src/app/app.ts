import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  IonApp,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuButton,
  IonMenuToggle,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bagHandleOutline,
  cartOutline,
  folderOutline,
  gridOutline,
  homeOutline,
  locationOutline,
  logInOutline,
  logOutOutline,
  peopleOutline,
  personAddOutline,
  personOutline,
  pricetagsOutline,
  receiptOutline,
  storefrontOutline,
} from 'ionicons/icons';

import { AuthService } from './services/auth.service';

type Link = { url: string; texto: string; icono: string };

@Component({
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    IonApp,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonMenuButton,
    IonMenuToggle,
    IonTitle,
    IonToolbar,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);

  //usuario logueado, null si no hay sesion
  protected readonly usuario = toSignal(this.#authService.usuario$, { initialValue: null });

  //links del menu segun el rol (los mismos roles que los guards de las rutas)
  protected readonly links = computed<Link[]>(() => {
    const rol = this.usuario()?.rol;
    const links: Link[] = [
      { url: '/', texto: 'Inicio', icono: 'home-outline' },
      { url: '/productos', texto: 'Productos', icono: 'storefront-outline' },
    ];

    if (!rol) {
      links.push(
        { url: '/login', texto: 'Iniciar sesión', icono: 'log-in-outline' },
        { url: '/registro', texto: 'Crear cuenta', icono: 'person-add-outline' },
      );
      return links;
    }

    if (rol === 'cliente') {
      links.push(
        { url: '/carrito', texto: 'Carrito', icono: 'cart-outline' },
        { url: '/mis-pedidos', texto: 'Mis pedidos', icono: 'receipt-outline' },
        { url: '/perfil/direcciones', texto: 'Mis direcciones', icono: 'location-outline' },
      );
    }
    if (rol === 'dueno') {
      links.push(
        { url: '/admin', texto: 'Panel administrador', icono: 'grid-outline' },
        { url: '/admin/productos', texto: 'Administrar productos', icono: 'pricetags-outline' },
        { url: '/admin/categorias', texto: 'Administrar categorías', icono: 'folder-outline' },
        { url: '/admin/usuarios', texto: 'Usuarios', icono: 'people-outline' },
      );
    }
    if (rol === 'cajero' || rol === 'dueno') {
      links.push({ url: '/admin/pedidos', texto: 'Pedidos entrantes', icono: 'bag-handle-outline' });
    }
    links.push({ url: '/perfil', texto: 'Mi perfil', icono: 'person-outline' });
    return links;
  });

  constructor() {
    addIcons({
      bagHandleOutline,
      cartOutline,
      folderOutline,
      gridOutline,
      homeOutline,
      locationOutline,
      logInOutline,
      logOutOutline,
      peopleOutline,
      personAddOutline,
      personOutline,
      pricetagsOutline,
      receiptOutline,
      storefrontOutline,
    });
  }

  //el estado local se limpia aunque la api falle, por eso se ignora el error
  protected cerrarSesion() {
    this.#authService.logout().subscribe({ error: () => {} });
    this.#router.navigate(['/login']);
  }
}
