import { browser, by, element } from 'protractor';

export class EvictionsAndroidPage {
  navigateTo() {
    return browser.get('/');
  }

  getParagraphText() {
    return element(by.css('evic-root h1')).getText();
  }
}
