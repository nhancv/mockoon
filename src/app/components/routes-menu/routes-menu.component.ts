import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { Environment, Route } from '@mockoon/commons';
import { combineLatest, Observable } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith
} from 'rxjs/operators';
import { RoutesContextMenu } from 'src/app/components/context-menu/context-menus';
import { ContextMenuEvent } from 'src/app/models/context-menu.model';
import { Settings } from 'src/app/models/settings.model';
import { EnvironmentsService } from 'src/app/services/environments.service';
import { EventsService } from 'src/app/services/events.service';
import { UIService } from 'src/app/services/ui.service';
import {
  DuplicatedRoutesTypes,
  EnvironmentsStatuses,
  Store
} from 'src/app/stores/store';

@Component({
  selector: 'app-routes-menu',
  templateUrl: './routes-menu.component.html',
  styleUrls: ['./routes-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoutesMenuComponent implements OnInit {
  @ViewChild('routesMenu', { static: false }) private routesMenu: ElementRef;
  public settings$: Observable<Settings>;
  public activeEnvironment$: Observable<Environment>;
  public routeList$: Observable<Route[]>;
  public activeRoute$: Observable<Route>;
  public environmentsStatus$: Observable<EnvironmentsStatuses>;
  public duplicatedRoutes$: Observable<DuplicatedRoutesTypes>;
  public routeFilter: FormControl;

  constructor(
    private environmentsService: EnvironmentsService,
    private store: Store,
    private eventsService: EventsService,
    private uiService: UIService,
    private formBuilder: FormBuilder
  ) {}

  /**
   * WIP
   * - ignore leading slash when searching
   * - (maybe) highlight the searched term
   * - move search input next to the plus +
   * - add a cross to remove the filter
   * - what to do with drag and drop: should be deactivated
   * - add tests
   */

  ngOnInit() {
    this.routeFilter = this.formBuilder.control('');

    this.activeEnvironment$ = this.store.selectActiveEnvironment();
    this.activeRoute$ = this.store.selectActiveRoute();
    this.duplicatedRoutes$ = this.store.select('duplicatedRoutes');
    this.environmentsStatus$ = this.store.select('environmentsStatus');
    this.settings$ = this.store.select('settings');

    this.routeList$ = combineLatest([
      this.store.selectActiveEnvironment().pipe(
        filter((activeEnvironment) => !!activeEnvironment),
        distinctUntilChanged(),
        map((activeEnvironment) => activeEnvironment.routes)
      ),
      this.routeFilter.valueChanges.pipe(debounceTime(50), startWith(''))
    ]).pipe(
      map(([routes, search]) => {
        console.log(search);

        return routes.filter(
          (route) =>
            route.endpoint.includes(search) ||
            route.documentation.includes(search)
        );
      })
    );

    this.uiService.scrollRoutesMenu.subscribe((scrollDirection) => {
      console.log('scroll');
      this.uiService.scroll(this.routesMenu.nativeElement, scrollDirection);
    });
  }

  /**
   * Create a new route in the current environment. Append at the end of the list
   */
  public addRoute() {
    this.environmentsService.addRoute();

    if (this.routesMenu) {
      this.uiService.scrollToBottom(this.routesMenu.nativeElement);
    }
  }

  /**
   * Select a route by UUID, or the first route if no UUID is present
   */
  public selectRoute(routeUUID: string) {
    this.environmentsService.setActiveRoute(routeUUID);
  }

  /**
   * Show and position the context menu
   *
   * @param event - click event
   */
  public openContextMenu(routeUUID: string, event: MouseEvent) {
    // if right click display context menu
    if (event && event.which === 3) {
      const menu: ContextMenuEvent = {
        event: event,
        items: RoutesContextMenu(routeUUID)
      };

      this.eventsService.contextMenuEvents.next(menu);
    }
  }
}
