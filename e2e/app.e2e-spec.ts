import { EvictionsAndroidPage } from './app.po';

describe('evictions-android App', () => {
  let page: EvictionsAndroidPage;

  beforeEach(() => {
    page = new EvictionsAndroidPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('evic works!');
  });
});
