import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../data-access/auth.service';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';


interface LogInForm {
  email: FormControl<null | string>;
  password: FormControl<null | string>;

}




@Component({
  selector: 'app-auth-log-in',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './auth-log-in.component.html',
  styleUrls: ['./auth-log-in.component.css']
})




export default class AuthLogInComponent {


  
  private _formBuilder = inject(FormBuilder);

  private _authService = inject(AuthService);

  private _router = inject(Router);


  form = this._formBuilder.group<LogInForm>({
    email: this._formBuilder.control(null, [Validators.required, Validators.email]),
    password: this._formBuilder.control(null, [Validators.required])

  })


  async submit() {


    if (this.form.invalid) { return; }  


    try {

      
    const {error, data} = await this._authService.logIn({
      email: this.form.value.email ?? '',
      password: this.form.value.password ?? ''
    });


    if (error) { throw error; }

    console.log(data);
    this._router.navigate(['/']);

    } catch (error) {

      if (error instanceof Error) {
        alert(error.message);
        return;
      }

    }

  }


}
