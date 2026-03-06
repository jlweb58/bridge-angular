import {Component, computed} from '@angular/core';

@Component({
  selector: 'app-privacy-page',
  standalone: true,
  templateUrl: './privacy.page.html',
})
export class PrivacyPage {
  private readonly emailLocalPart = 'jlweb58';
  private readonly emailDomain = 'gmail';
  private readonly emailTld = 'com';

  protected readonly emailText = computed(
    () => `${this.emailLocalPart}@${this.emailDomain}.${this.emailTld}`,
  );


}
