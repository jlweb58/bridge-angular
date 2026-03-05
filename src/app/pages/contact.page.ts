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

  protected copied = false;


  protected onEmailClick(ev: MouseEvent): void {
    ev.preventDefault();

    const address = this.emailText();

    // More reliable than window.location.href in some browsers
    const a = document.createElement('a');
    a.href = `mailto:${address}`;
    a.rel = 'noreferrer noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();

    // If the browser has no mail handler, provide a quick fallback (copy).
    // (We can’t reliably detect whether mail app opened.)
    this.copyEmailToClipboard().catch(() => {
      // ignore; user can still manually select the text on the page
    });
  }

  protected async copyEmailToClipboard(): Promise<void> {
    const address = this.emailText();
    await navigator.clipboard.writeText(address);
    this.copied = true;
    setTimeout(() => (this.copied = false), 1500);
  }

}
