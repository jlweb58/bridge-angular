import {Component, computed} from '@angular/core';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  templateUrl: './contact.page.html',
})
export class ContactPage {
  protected readonly fullName = 'John Webber';

  private readonly emailLocalPart = 'jlweb58';
  private readonly emailDomain = 'gmail';
  private readonly emailTld = 'com';

  protected readonly emailText = computed(
    () => `${this.emailLocalPart}@${this.emailDomain}.${this.emailTld}`,
  );

  protected readonly linkedInUrl = 'https://www.linkedin.com/in/john-webber-1a52546/';

  protected onEmailClick(): void {
    // Create the mailto only on user action (not present in initial HTML).
    const address = this.emailText();
    window.location.href = `mailto:${address}`;
  }


}
