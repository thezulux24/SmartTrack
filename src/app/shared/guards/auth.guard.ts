import { inject } from "@angular/core";
import { CanActivateChildFn, CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../../auth/data-access/auth.service";

const routerInjection = () => inject(Router);

const authService = () => inject(AuthService);

export const privateGuard: CanActivateFn = async () => {
    const router = routerInjection();

    const {data} = await authService().session();

    console.log(!!data.session);

    if (!data.session) {
        router.navigate(['/auth/log-in']);
    }
    return !!data.session;
};

export const publicGuard: CanActivateFn = async () => {


     const router = routerInjection();

    const {data} = await authService().session();

    console.log(!!data.session);

    if (data.session) {
        router.navigate(['/']);
    }
    return !data.session;
};
