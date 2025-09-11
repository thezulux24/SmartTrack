import { inject, Injectable } from "@angular/core";
import { SupabaseService } from "../../shared/data-access/supabase.service";
import { SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from "@supabase/supabase-js";



@Injectable({providedIn: 'root' })
export class AuthService {

    private _supabaseClient = inject(SupabaseService).supabaseClient;


    // constructor(){
    //     this._supabaseClient.auth.onAuthStateChange((event, session) => {
    //         console.log('Auth state changed:', event, session);
    //     });
    // }




    session(){

        return this._supabaseClient.auth.getSession(); // devuelve una promesa con la sesión actual
    }



    signUp(credentials: SignUpWithPasswordCredentials){

        return this._supabaseClient.auth.signUp(credentials);

    }

    logIn(credentials: SignUpWithPasswordCredentials){

         return this._supabaseClient.auth.signInWithPassword(credentials);

    }

    logOut(){
        return this._supabaseClient.auth.signOut();
    }

}