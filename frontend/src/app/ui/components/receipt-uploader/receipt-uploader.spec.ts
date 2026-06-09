import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReceiptUploader } from './receipt-uploader';

describe('ReceiptUploader', () => {
  let component: ReceiptUploader;
  let fixture: ComponentFixture<ReceiptUploader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceiptUploader],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceiptUploader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
