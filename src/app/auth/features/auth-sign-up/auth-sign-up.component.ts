import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../data-access/auth.service';


interface SignUpForm {
  full_name: FormControl<null | string>;
  email: FormControl<null | string>;
  password: FormControl<null | string>;
}


@Component({
  selector: 'app-auth-sign-up',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './auth-sign-up.component.html',
  styleUrls: ['./auth-sign-up.component.css']
})
export default class AuthSignUpComponent {



  private _formBuilder = inject(FormBuilder);

  private _authService = inject(AuthService);


  form = this._formBuilder.group<SignUpForm>({
    full_name: this._formBuilder.control(null, [Validators.required]),
    email: this._formBuilder.control(null, [Validators.required, Validators.email]),
    password: this._formBuilder.control(null, [Validators.required])
  })



  async submit() {

    if (this.form.invalid) { return; }




    try {

      const authResponse = await this._authService.signUp({
        email: this.form.value.email ?? '',
        password: this.form.value.password ?? ''
      }
      );
    
      if (authResponse.error) { throw authResponse.error; }

      alert('Usuario creado con éxito');



    
    } catch (error) {
      alert('Error al crear el usuario');
      console.error( error);
    }


  }

}
