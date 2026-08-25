(function(){
  'use strict';

  const STORAGE_KEY='vensis_language_v1';
  const DEFAULT_LANGUAGE='en';

  const translations={
    'Fan Selection':'Fan Seçimi',
    '⌕ Fan Selection':'⌕ Fan Seçimi',
    'Open Fan Selection':'Fan Seçimini Aç',
    'Product Catalog':'Ürün Kataloğu',
    '▦ Product Catalog':'▦ Ürün Kataloğu',
    'Open Product Catalog':'Ürün Kataloğunu Aç',
    'Projects':'Projeler',
    '▣ Projects':'▣ Projeler',
    'Open Projects':'Projeleri Aç',
    'View Projects':'Projeleri Gör',
    'Selection Workspace':'Seçim Çalışma Alanı',
    'Airflow / Pressure':'Debi / Basınç',
    'Flow (m³/h)':'Debi (m³/h)',
    'Flow':'Debi',
    'Airflow':'Debi',
    'Enter airflow':'Debi girin',
    'Airflow tolerance':'Debi toleransı',
    'Minimum airflow tolerance':'Minimum debi toleransı',
    'Maximum airflow tolerance':'Maksimum debi toleransı',
    'Pressure (Pa)':'Basınç (Pa)',
    'Pressure':'Basınç',
    'Enter pressure':'Basınç girin',
    'Pressure tolerance':'Basınç toleransı',
    'Minimum pressure tolerance':'Minimum basınç toleransı',
    'Maximum pressure tolerance':'Maksimum basınç toleransı',
    'Product Filter':'Ürün Filtresi',
    'Category':'Kategori',
    'Search category...':'Kategori ara...',
    'Brand':'Marka',
    'Model':'Model',
    'Search model or product code...':'Model veya ürün kodu ara...',
    'Reset':'Sıfırla',
    'Find Fans':'Fanları Bul',
    'Matching Fans':'Uygun Fanlar',
    'Enter flow and pressure values to begin.':'Başlamak için debi ve basınç değerlerini girin.',
    'No matching fan found for these conditions.':'Bu koşullara uygun fan bulunamadı.',
    'Closest Match':'En Yakın Eşleşme',
    'Filters':'Filtreler',
    'Manufacturer':'Üretici',
    'Reset Filters':'Filtreleri Sıfırla',
    'Series':'Seri',
    '＋ Add Product':'＋ Ürün Ekle',
    'Add Product':'Ürün Ekle',
    'Specifications':'Teknik Özellikler',
    'Specification':'Teknik Özellik',
    'Performance':'Performans',
    'Dimensions':'Ölçüler',
    'Dimension':'Ölçü',
    'Operating Points':'Çalışma Noktaları',
    'Operating Point':'Çalışma Noktası',
    'Datasheet':'Teknik Föy',
    'Technical Datasheet':'Teknik Föy',
    'View datasheet':'Teknik föyü görüntüle',
    'Back to Catalog':'Kataloğa Dön',
    'Project Destination':'Proje Hedefi',
    'Add selected fans to a project':'Seçilen fanları bir projeye ekleyin',
    'Select project destination':'Proje hedefini seçin',
    'A new project will be created when you add the first fan.':'İlk fanı eklediğinizde yeni bir proje oluşturulacaktır.',
    'Selected Project':'Seçilen Proje',
    'Open Project':'Projeyi Aç',
    'Add to selected project':'Seçilen projeye ekle',
    'Datasheet renderer is unavailable.':'Teknik föy görüntüleyici kullanılamıyor.',
    'Create, select and manage project workspaces.':'Proje çalışma alanlarını oluşturun, seçin ve yönetin.',
    '+ New Project':'+ Yeni Proje',
    'New Project':'Yeni Proje',
    'Untitled Project':'Adsız Proje',
    'Total Projects':'Toplam Proje',
    'Total Units':'Toplam Adet',
    'Combined Net Value':'Toplam Net Tutar',
    'Search':'Ara',
    'Search project or company':'Proje veya firma ara',
    'Project Month':'Proje Ayı',
    'All months':'Tüm aylar',
    'Showing all projects':'Tüm projeler gösteriliyor',
    'No projects yet':'Henüz proje yok',
    'Create your first project to start adding products.':'Ürün eklemeye başlamak için ilk projenizi oluşturun.',
    'Create Project':'Proje Oluştur',
    'No matching projects':'Eşleşen proje yok',
    'Try another project name, company or month.':'Başka bir proje adı, firma veya ay deneyin.',
    'Clear Filters':'Filtreleri Temizle',
    'Create a separate workspace for products, pricing and quotation settings.':'Ürünler, fiyatlandırma ve teklif ayarları için ayrı bir çalışma alanı oluşturun.',
    'Project Name':'Proje Adı',
    'Enter project name':'Proje adını girin',
    'Customer / Reference':'Müşteri / Referans',
    'Enter customer or reference':'Müşteri veya referans girin',
    'Contact Person / İlgili':'İlgili Kişi',
    'Contact Person':'İlgili Kişi',
    'Enter contact person':'İlgili kişiyi girin',
    'Cancel':'İptal',
    'Draft':'Taslak',
    'Quoted':'Teklif Verildi',
    'Won':'Kazanıldı',
    'Ordered':'Sipariş Verildi',
    'Lost':'Kaybedildi',
    'Cloud synced':'Bulut senkronize',
    '☁ Cloud synced':'☁ Bulut senkronize',
    'Syncing…':'Senkronize ediliyor…',
    '☁ Syncing…':'☁ Senkronize ediliyor…',
    'Sync error':'Senkronizasyon hatası',
    '⚠ Sync error':'⚠ Senkronizasyon hatası',
    'Browser only':'Yalnızca tarayıcı',
    '☁ Browser only':'☁ Yalnızca tarayıcı',
    'Project cloud status':'Proje bulut durumu',
    'Checking cloud storage…':'Bulut depolama kontrol ediliyor…',
    'Saving projects to cloud…':'Projeler buluta kaydediliyor…',
    'Syncing browser projects with cloud…':'Tarayıcı projeleri bulutla senkronize ediliyor…',
    'Cloud connection failed; projects remain in this browser.':'Bulut bağlantısı kurulamadı; projeler bu tarayıcıda kalacak.',
    'Browser only — sign in to sync.':'Yalnızca tarayıcı — senkronizasyon için giriş yapın.',
    'Sync failed; your projects are still safe in this browser.':'Senkronizasyon başarısız; projeleriniz bu tarayıcıda güvende.',
    'All Projects':'Tüm Projeler',
    '← All Projects':'← Tüm Projeler',
    'Back to Projects':'Projelere Dön',
    'Project Workspace':'Proje Çalışma Alanı',
    'Project Details':'Proje Bilgileri',
    'Project Status':'Proje Durumu',
    'Status':'Durum',
    'Save':'Kaydet',
    'Saved':'Kaydedildi',
    'Saving…':'Kaydediliyor…',
    'Print Project':'Projeyi Yazdır',
    'Print Quotation':'Teklifi Yazdır',
    'Quotation':'Teklif',
    'Create Quotation':'Teklif Oluştur',
    'Commercial Quotation':'Ticari Teklif',
    'Print / PDF':'Yazdır / PDF',
    'PDF / Print':'PDF / Yazdır',
    'Preview':'Önizleme',
    'Order Form':'Sipariş Formu',
    'Clear Project':'Projeyi Temizle',
    'Project Discount':'Proje İskontosu',
    'Apply one discount rate to all products':'Tüm ürünlere tek iskonto oranı uygulayın',
    'An individual product discount replaces the project discount for that product. Percentages are never added together.':'Ürüne özel iskonto varsa proje iskontosunun yerine geçer. İskonto oranları birbiriyle toplanmaz.',
    'Project discount percentage':'Proje iskonto yüzdesi',
    'Apply to All':'Tümüne Uygula',
    'Quantity':'Adet',
    'Qty':'Adet',
    'Unit Price':'Birim Fiyat',
    'List Price':'Liste Fiyatı',
    'List Price (€)':'Liste Fiyatı (€)',
    'Price (€)':'Fiyat (€)',
    'Total':'Toplam',
    'Net Total':'Net Toplam',
    'Discount':'İskonto',
    'Global Discount':'Genel İskonto',
    'Net Unit Price':'Net Birim Fiyat',
    'Product':'Ürün',
    'Product / Free Note':'Ürün / Serbest Not',
    'Product / Model':'Ürün / Model',
    'Selected / Nominal':'Seçilen / Nominal',
    'Selected / Nominal Airflow (m³/h)':'Seçilen / Nominal Debi (m³/h)',
    'Required':'İstenen',
    'Required / Source':'İstenen / Kaynak',
    'Power':'Güç',
    'Motor Power':'Motor Gücü',
    'Motor Power (kW)':'Motor Gücü (kW)',
    'Speed':'Devir',
    'Speed (rpm)':'Devir (rpm)',
    'Noise':'Ses',
    'Noise dB(A)':'Ses dB(A)',
    'Voltage':'Gerilim',
    'Frequency':'Frekans',
    'Current':'Akım',
    'Current (A)':'Akım (A)',
    'Order':'Sıra',
    'Actions':'İşlemler',
    'Remove':'Kaldır',
    'Edit':'Düzenle',
    'No products added yet':'Henüz ürün eklenmedi',
    'Add fans from Fan Selection, Product Catalog or the custom product form below.':'Fan Seçimi, Ürün Kataloğu veya aşağıdaki özel ürün formundan ürün ekleyin.',
    'Manual Project Item':'Manuel Proje Kalemi',
    'Add a product outside the selection database':'Seçim veritabanı dışından ürün ekleyin',
    'The product will be added at the bottom of the current project list.':'Ürün mevcut proje listesinin sonuna eklenecektir.',
    'Project Product Editor':'Proje Ürün Editörü',
    'Add Custom Product':'Özel Ürün Ekle',
    'Enter a product that is not available in the selection program.':'Seçim programında bulunmayan bir ürünü girin.',
    'Series / Type':'Seri / Tip',
    'Free Description':'Serbest Açıklama',
    'Add a project-specific description, option, material, accessory or note.':'Projeye özel açıklama, opsiyon, malzeme, aksesuar veya not ekleyin.',
    'Image URL (optional)':'Görsel URL (opsiyonel)',
    'Add to Project':'Projeye Ekle',
    'Quotation Total':'Teklif Toplamı',
    'Quotation Scope':'Teklif Kapsamı',
    'Commercial Terms':'Ticari Şartlar',
    'Page 1 / 3':'Sayfa 1 / 3',
    'Page 2 / 3':'Sayfa 2 / 3',
    'Page 3 / 3':'Sayfa 3 / 3',
    'Back to Project':'Projeye Dön',
    '← Back to Project':'← Projeye Dön',
    'No quotation found':'Teklif bulunamadı',
    'Return to the project and choose Print Quotation.':'Projeye dönüp Teklifi Yazdır seçeneğini kullanın.',
    'Main Page':'Ana Sayfa',
    'Send by Email':'E-posta ile Gönder',
    'Send Project Report':'Proje Raporunu Gönder',
    'Company Name':'Firma Adı',
    'To':'Kime',
    'Subject':'Konu',
    'Message':'Mesaj',
    'Your email application will open with these details.':'E-posta uygulamanız bu bilgilerle açılacaktır.',
    'Please enter an email address.':'Lütfen bir e-posta adresi girin.',
    'Order Management':'Sipariş Yönetimi',
    'New Order':'Yeni Sipariş',
    '+ New Order':'+ Yeni Sipariş',
    'Order Form Editor':'Sipariş Formu Editörü',
    'Edit company, delivery conditions and products to be ordered.':'Firma, teslim koşulları ve siparişe girecek ürünleri düzenleyin.',
    'Order No':'Sipariş No',
    'Order Date':'Sipariş Tarihi',
    'Ordering Company':'Sipariş Veren',
    'Recipient Type':'Alıcı Türü',
    'Supplier':'Tedarikçi',
    'Company':'Firma',
    'Contact':'Yetkili',
    'Email':'E-posta',
    'Delivery Time':'Teslim Süresi',
    'Delivery Place':'Teslim Yeri',
    'Payment Terms':'Ödeme Şekli',
    'Order Note':'Sipariş Notu',
    'Order Items':'Sipariş Kalemleri',
    'Save Draft':'Taslağı Kaydet',
    'Order Sent':'Sipariş Verildi',
    'Purchase Order':'Sipariş Formu',
    'Order Information':'Sipariş Bilgileri',
    'Source Quotation':'Kaynak Teklif',
    'Supplier / Project':'Tedarikçi / Proje',
    'Project':'Proje',
    'Line':'Sıra',
    'Product / Model / Technical Description':'Ürün / Model / Teknik Açıklama',
    'Electrical / Motor':'Elektrik / Motor',
    'Total Quantity':'Toplam Adet',
    'Ordered By':'Siparişi Veren',
    'Received By':'Siparişi Alan',
    'No order form found':'Sipariş formu bulunamadı',
    'Return to the project and recreate the order form.':'Projeye dönüp sipariş formunu yeniden oluşturun.',
    'Notes':'Notlar',
    'Note':'Not',
    'Description':'Açıklama',
    'Technical Description':'Teknik Açıklama',
    'Model Code':'Model Kodu',
    'Product Code':'Ürün Kodu',
    'Project No':'Proje No',
    'Quotation No':'Teklif No',
    'Reference':'Referans',
    'Customer':'Müşteri',
    'Date':'Tarih',
    'Close':'Kapat',
    'Product details could not be opened.':'Ürün detayları açılamadı.',
    'No product key received.':'Ürün anahtarı alınamadı.',
    'Product detail data was not found.':'Ürün detay verisi bulunamadı.'
  };

  // Expand Turkish application coverage
  Object.assign(translations,{
    'Enter valid flow and pressure values to begin.':'Başlamak için geçerli debi ve basınç değerleri girin.',
    'Flow range:':'Debi aralığı:',
    'Pressure range:':'Basınç aralığı:',
    'Max Pressure':'Maks. Basınç',
    'Price':'Fiyat',
    'Add to project':'Projeye ekle',
    'Edit model':'Modeli düzenle',
    'Edit series information':'Seri bilgilerini düzenle',
    'Open Product PDF':'Ürün PDF’ini Aç',
    'Series Information':'Seri Bilgileri',
    'No information available.':'Bilgi bulunmuyor.',
    'Catalog Item':'Katalog Ürünü',
    'Catalog product':'Katalog ürünü',
    'Catalog Only':'Yalnızca Katalog',
    'Project quantity increased.':'Projedeki adet artırıldı.',
    'Catalog model added to project.':'Katalog modeli projeye eklendi.',
    'Speed Controller':'Hız Kontrol Cihazı',
    'Long-Life Motor':'Uzun Ömürlü Motor',
    'Fan Type':'Fan Tipi',
    'Mount Type':'Montaj Tipi',
    'Fire Rating':'Yangın Dayanımı',
    'Sound Level':'Ses Seviyesi',
    'Static Pressure':'Statik Basınç',
    'Static Pressure (Pa)':'Statik Basınç (Pa)',
    'Air Flow (m³/h)':'Debi (m³/h)',
    'Selected Airflow':'Seçilen Debi',
    'Nominal Airflow':'Nominal Debi',
    'Voltage / Frequency':'Gerilim / Frekans',
    'Control':'Kontrol',
    'Controls':'Kontrol Seçenekleri',
    'IP Class':'IP Sınıfı',
    'Phase':'Faz',
    'Availability Region':'Kullanılabilirlik Bölgesi',
    'General Features':'Genel Özellikler',
    'General Information':'Genel Bilgiler',
    'Motor Information':'Motor Bilgileri',
    'Areas of Usage':'Kullanım Alanları',
    'Applications':'Uygulamalar',
    'Motor':'Motor',
    'Decrease quantity':'Adedi azalt',
    'Increase quantity':'Adedi artır',
    'Move up':'Yukarı taşı',
    'Move down':'Aşağı taşı',
    'Move product up':'Ürünü yukarı taşı',
    'Move product down':'Ürünü aşağı taşı',
    'Edit custom product':'Özel ürünü düzenle',
    'Remove from project':'Projeden kaldır',
    'Free Note':'Serbest Not',
    'Project-specific note shown in project and quotation outputs.':'Proje ve teklif çıktılarında gösterilecek projeye özel not.',
    'Add at least one product before creating a quotation.':'Teklif oluşturmadan önce en az bir ürün ekleyin.',
    'Add at least one product before printing the project.':'Projeyi yazdırmadan önce en az bir ürün ekleyin.',
    'Remove all products from this project?':'Bu projedeki tüm ürünler kaldırılsın mı?',
    'This project product is linked to the fan database. Only the free description can be changed here.':'Bu proje ürünü fan veritabanına bağlıdır. Burada yalnızca serbest açıklama değiştirilebilir.',
    'Edit Custom Product':'Özel Ürünü Düzenle',
    'Edit Product Description':'Ürün Açıklamasını Düzenle',
    'Save Changes':'Değişiklikleri Kaydet',
    'No customer or reference entered':'Müşteri veya referans girilmedi',
    'No contact person entered':'İlgili kişi girilmedi',
    'Duplicate project':'Projeyi çoğalt',
    'Delete project':'Projeyi sil',
    'Existing Project':'Mevcut Proje',
    'Please open a project first.':'Lütfen önce bir proje açın.',
    'No active project selected. Please open a project first.':'Aktif proje seçilmedi. Lütfen önce bir proje açın.',
    'Quotation Settings':'Teklif Ayarları',
    'Close quotation settings':'Teklif ayarlarını kapat',
    'Quotation settings saved.':'Teklif ayarları kaydedildi.',
    'Restore all quotation texts to the default values?':'Tüm teklif metinleri varsayılan değerlere döndürülsün mü?',
    'Default quotation settings restored.':'Varsayılan teklif ayarları geri yüklendi.',
    'No performance curve data available.':'Performans eğrisi verisi bulunmuyor.',
    'Fan Performance Curve':'Fan Performans Eğrisi',
    'Fan performance curve':'Fan performans eğrisi',
    'Required Point':'İstenen Nokta',
    'Program Selected':'Programın Seçtiği',
    'Program Selected Point':'Programın Seçtiği Nokta',
    'Required / Program Selected Point':'İstenen / Programın Seçtiği Nokta',
    'Technical Product Datasheet':'Teknik Ürün Föyü',
    'PRODUCT DATASHEET':'ÜRÜN TEKNİK FÖYÜ',
    'SPECIFICATIONS':'TEKNİK ÖZELLİKLER',
    'Performance Curve':'Performans Eğrisi',
    'Print / Save PDF':'Yazdır / PDF Kaydet',
    'Technical data is based on manufacturer catalogue information. Project suitability should be confirmed by Vensis.':'Teknik veriler üretici katalog bilgilerine dayanmaktadır. Projeye uygunluk Vensis tarafından doğrulanmalıdır.',
    'Save as PDF':'PDF Olarak Kaydet',
    'Technical Project Output':'Teknik Proje Çıktısı',
    'PROJECT TECHNICAL DOCUMENT':'PROJE TEKNİK DOKÜMANI',
    'Project list and product datasheets':'Proje listesi ve ürün teknik föyleri',
    'CUSTOM PRODUCT TECHNICAL SHEET':'ÖZEL ÜRÜN TEKNİK FÖYÜ',
    'PROJECT SPECIFICATIONS':'PROJE TEKNİK ÖZELLİKLERİ',
    'Project Description':'Proje Açıklaması',
    'Document Note':'Doküman Notu',
    'Project-defined product':'Projede tanımlanan ürün',
    'No product image':'Ürün görseli yok',
    'No additional project description was entered.':'Ek proje açıklaması girilmedi.',
    'No project products found':'Projede ürün bulunamadı',
    'Return to the project and add products before printing.':'Projeye dönüp yazdırmadan önce ürün ekleyin.',
    'Custom Product':'Özel Ürün',
    'Custom product data is based on project-entered information and should be verified before order.':'Özel ürün verileri projeye girilen bilgilere dayanır ve siparişten önce doğrulanmalıdır.',
    'This custom product was entered manually in the project and is not linked to a verified selection-program performance curve. Technical suitability and manufacturer data should be confirmed before order.':'Bu özel ürün projeye manuel olarak girilmiştir ve doğrulanmış bir seçim programı performans eğrisine bağlı değildir. Teknik uygunluk ve üretici verileri siparişten önce doğrulanmalıdır.',
    'Document generated by Vensis Engineering Suite':'Doküman Vensis Engineering Suite tarafından oluşturulmuştur',
    'Project Datasheet Appendix':'Proje Teknik Föy Eki',
    'Custom Product Appendix':'Özel Ürün Eki',
    'Product Datasheet':'Ürün Teknik Föyü',
    'Project Technical Document':'Proje Teknik Dokümanı',
    'Technical Project Print':'Teknik Proje Çıktısı',
    'Product series':'Ürün Serisi',
    'Catalog Values':'Katalog Değerleri',
    'Setup required':'Kurulum gerekli',
    'The secure server settings have not been completed yet.':'Güvenli sunucu ayarları henüz tamamlanmadı.',
    'Enter the secure workspace password. It is verified only on the server.':'Güvenli çalışma alanı parolasını girin. Parola yalnızca sunucuda doğrulanır.',
    'Open Secure Workspace':'Güvenli Çalışma Alanını Aç',
    'Open secure Edit Mode':'Güvenli Düzenleme Modunu Aç',
    'Open secure Project Cloud':'Güvenli Proje Bulutunu Aç',
    'Edit Mode and Project Cloud are active':'Düzenleme Modu ve Proje Bulutu aktif',
    'Project Cloud is active':'Proje Bulutu aktif',
    'Secure Edit Mode opened.':'Güvenli Düzenleme Modu açıldı.',
    'Project Cloud opened. Syncing projects…':'Proje Bulutu açıldı. Projeler senkronize ediliyor…',
    'Catalog Edit Mode active':'Katalog Düzenleme Modu aktif',
    'Project Cloud active':'Proje Bulutu aktif',
    'Edit Mode closed.':'Düzenleme Modu kapatıldı.',
    'Project Cloud signed out. Browser copies remain available.':'Proje Bulutu oturumu kapatıldı. Tarayıcıdaki kopyalar kullanılabilir durumda.',
    'Edit service could not be reached.':'Düzenleme servisine ulaşılamadı.',
    'Edit request failed.':'Düzenleme isteği başarısız oldu.',
    'Server settings are not yet stored outside the deployment folder. Re-save config.local.php before saving changes.':'Sunucu ayarları henüz dağıtım klasörü dışında saklanmıyor. Değişiklikleri kaydetmeden önce config.local.php dosyasını yeniden kaydedin.',
    'Series information, images and every model-card value can be changed.':'Seri bilgileri, görseller ve model kartındaki tüm değerler değiştirilebilir.',
    'The selected image could not be read.':'Seçilen görsel okunamadı.',
    'Choose a JPEG, PNG or WebP image.':'JPEG, PNG veya WebP görsel seçin.',
    'The image must be smaller than 3 MB.':'Görsel 3 MB’dan küçük olmalıdır.',
    'Series could not be opened for editing.':'Seri düzenleme için açılamadı.',
    'Edit the catalog identity, information and image for this series.':'Bu serinin katalog kimliğini, bilgilerini ve görselini düzenleyin.',
    'Enter one category per line. Commas are also accepted.':'Her satıra bir kategori girin. Virgülle ayırma da kullanılabilir.',
    'Enter one item per line.':'Her satıra bir öğe girin.',
    'New image selected. It will be uploaded when you save.':'Yeni görsel seçildi. Kaydettiğinizde yüklenecek.',
    'No values changed.':'Herhangi bir değer değiştirilmedi.',
    'Uploading the image and series information…':'Görsel ve seri bilgileri yükleniyor…',
    'Save to GitHub':'GitHub’a Kaydet',
    'Series change committed':'Seri değişikliği kaydedildi',
    'Hostinger will deploy the new GitHub commit automatically.':'Hostinger yeni GitHub kaydını otomatik olarak canlıya alacaktır.',
    'Open on GitHub':'GitHub’da Aç',
    'No catalog series is available.':'Katalog serisi bulunmuyor.',
    'Add Product Manually':'Manuel Ürün Ekle',
    'Choose an existing series and enter the catalog values.':'Mevcut bir seri seçip katalog değerlerini girin.',
    'Model Name':'Model Adı',
    'Choose a series.':'Bir seri seçin.',
    'Model Name cannot be empty.':'Model adı boş bırakılamaz.',
    'Creating the product and committing it to GitHub…':'Ürün oluşturuluyor ve GitHub’a kaydediliyor…',
    'Product added':'Ürün eklendi',
    'New product':'Yeni ürün',
    'Add to GitHub':'GitHub’a Ekle',
    'Model could not be opened for editing.':'Model düzenleme için açılamadı.',
    'Fan model':'Fan modeli',
    'Edit every value displayed on this catalog model card.':'Bu katalog model kartında görüntülenen tüm değerleri düzenleyin.',
    'Axial Fan':'Aksiyel Fan',
    'Radial Fan':'Radyal Fan',
    'Duct Fan':'Kanal Tipi Fan',
    'Cabinet Fan':'Hücreli Fan',
    'Jet Fan':'Jet Fan',
    'Tunnel Fan':'Tünel Fanı',
    'Roof Fan':'Çatı Fanı',
    'Wall-Mounted Fan':'Duvar Tipi Fan',
    'Mobile Fan':'Mobil Fan',
    'Centrifugal Fan':'Santrifüj Fan',
    'Bifurcated Fan':'Bifurkasyonlu Fan',
    'Short-Casing Fan':'Kısa Kasalı Fan',
    'Smoke Exhaust Fan':'Duman Tahliye Fanı',
    'Explosion-Proof / ATEX Fan':'Ex-proof / ATEX Fan',
    'Shelter Fan':'Sığınak Fanı',
    'Tunnel Type Axial Fan':'Tünel Tipi Aksiyel Fan',
    'Axial Mobile Ex-proof Fan':'Aksiyel Mobil Ex-proof Fan',
    'Axial Duct Type Ex-proof Fan':'Aksiyel Kanal Tipi Ex-proof Fan',
    'Axial Roof Type Ex-proof Fan':'Aksiyel Çatı Tipi Ex-proof Fan',
    'Centrifugal Roof Type Ex-proof Fan':'Santrifüj Çatı Tipi Ex-proof Fan',
    'Centrifugal Duct Type Ex-proof Fan':'Santrifüj Kanal Tipi Ex-proof Fan',
    'Centrifugal Single Inlet Ex-proof Fan':'Santrifüj Tek Emişli Ex-proof Fan',
    'Axial Mobile Fan':'Aksiyel Mobil Fan',
    'Vertical Outlet Centrifugal Roof Type Fan':'Dikey Atışlı Santrifüj Çatı Fanı',
    'Centrifugal Rectangular Duct Type Fan':'Santrifüj Dikdörtgen Kanal Tipi Fan',
    'Centrifugal Cell Type Fan':'Santrifüj Hücreli Fan',
    'Horizontal Outlet Centrifugal Roof Type Fan':'Yatay Atışlı Santrifüj Çatı Fanı',
    'Axial Jet Fan':'Aksiyel Jet Fan',
    'Axial Duct Type Fan':'Aksiyel Kanal Tipi Fan',
    'Axial Short Case Fan':'Aksiyel Kısa Kasalı Fan',
    'Axial Wall Type Fan':'Aksiyel Duvar Tipi Fan',
    'Bifurcated Axial Duct Type Fan':'Bifurkasyonlu Aksiyel Kanal Tipi Fan',
    'Horizontal Outlet Axial Roof Type Fan':'Yatay Atışlı Aksiyel Çatı Fanı',
    'Vertical Outlet Axial Roof Type Fan':'Dikey Atışlı Aksiyel Çatı Fanı',
    'Centrifugal Single Inlet Cell Type Fan':'Santrifüj Tek Emişli Hücreli Fan',
    'Centrifugal Single Inlet Fan':'Santrifüj Tek Emişli Fan',
    'Duct Type Shelter Fan':'Kanal Tipi Sığınak Fanı',
    'Customers':'Müşteriler',
    '+ New Customer':'+ Yeni Müşteri',
    'New Customer':'Yeni Müşteri',
    'Customer records and related project history':'Müşteri kayıtları ve bağlantılı proje geçmişi',
    'Total':'Toplam',
    'Showing':'Gösterilen',
    'Search company, contact or tax number':'Firma, yetkili veya vergi no ara',
    'Company Name':'Firma Adı',
    'Tax Office':'Vergi Dairesi',
    'Tax Number':'Vergi No',
    'Phone':'Telefon',
    'Address':'Adres',
    'Past Quotations and Orders':'Geçmiş Teklifler ve Siparişler',
    'Not provided':'Bilgi eklenmedi',
    'No customers in this browser yet':'Bu tarayıcıda henüz müşteri yok',
    'Sign in to restore cloud customers, or add a new customer locally.':'Buluttaki müşterileri getirmek için giriş yapın veya bu tarayıcıya yeni müşteri ekleyin.',
    'No linked quotations or orders yet.':'Henüz bağlı teklif veya sipariş yok.',
    'Company name is required.':'Firma adı gerekli.',
    'Save failed.':'Kayıt başarısız.',
    'New customer card opened.':'Yeni müşteri kartı açıldı.',
    'Customer could not be created.':'Yeni müşteri oluşturulamadı.',
    'Checking customer cloud…':'Müşteri bulutu kontrol ediliyor…',
    'Syncing browser customers with cloud…':'Tarayıcıdaki müşteriler bulutla senkronize ediliyor…',
    'Customer cloud synced':'Müşteri bulutu senkronize',
    'Cloud connection failed; customers remain in this browser.':'Bulut bağlantısı kurulamadı; müşteriler bu tarayıcıda kalacak.',
    'Sync failed; customers remain in this browser.':'Senkronizasyon başarısız; müşteriler bu tarayıcıda kalacak.',
    'Catalog Type':'Katalog Türü',
    'Choose a catalog type.':'Katalog türünü seçin.',
    'VENTILATION':'HAVALANDIRMA',
    'ELECTRICAL':'ELEKTRİK',
    'Electrical Catalog':'Elektrik Kataloğu',
    '← Electrical Catalog':'← Elektrik Kataloğu',
    'Electrical Product Catalog':'Elektrik Ürün Kataloğu',
    'Back to Electrical Catalog':'Elektrik Kataloğuna Dön',
    'No series match these filters.':'Bu filtrelerle eşleşen seri bulunamadı.',
    'No submodels found.':'Alt model bulunamadı.',
    'Submodels':'Alt Modeller',
    'Insulation':'İzolasyon',
    'Lumen':'Lümen',
    'Operating Temperature':'Çalışma Sıcaklığı',
    'Password':'Parola',
    'Sign in':'Giriş Yap',
    'Checking…':'Kontrol ediliyor…',
    'Sign out':'Çıkış Yap',
    'Continue':'Devam Et',
    'Secure Project Cloud':'Güvenli Proje Bulutu',
    'Project Cloud active':'Proje Bulutu aktif',
    'Menu':'Menü',
    'Secure session is open':'Güvenli oturum açık',
    'Projects and customers are stored outside public_html on Hostinger.':'Projeler ve müşteriler Hostinger’da public_html dışında saklanır.',
    'Projects and customers are synchronized securely across your devices.':'Projeler ve müşteriler cihazlarınız arasında güvenli şekilde senkronize edilir.',
    'Browser copies remain available for speed. The protected Hostinger copy restores them on another signed-in device.':'Tarayıcı kopyaları hızlı erişim için korunur. Hostinger’daki güvenli kopya, giriş yaptığınız diğer cihazlarda verileri geri getirir.',
    'VensisCatalog is empty or unavailable.':'VensisCatalog boş veya kullanılamıyor.'
  });

  const reverse=Object.create(null);
  Object.keys(translations).forEach(key=>{if(!reverse[translations[key]])reverse[translations[key]]=key});

  const ignoredParents=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','CODE','PRE']);
  const attributes=['placeholder','title','aria-label'];
  let currentLanguage=readLanguage();
  let observer=null;
  let applying=false;

  function readLanguage(){
    try{
      const saved=localStorage.getItem(STORAGE_KEY);
      return saved==='tr'||saved==='en'?saved:DEFAULT_LANGUAGE;
    }catch{return DEFAULT_LANGUAGE}
  }

  function canonical(value){
    const clean=String(value||'').trim();
    if(!clean)return clean;
    if(Object.prototype.hasOwnProperty.call(translations,clean))return clean;
    if(Object.prototype.hasOwnProperty.call(reverse,clean))return reverse[clean];
    return clean;
  }

  function translateExact(value,lang=currentLanguage){
    const source=canonical(value);
    if(lang==='tr'&&Object.prototype.hasOwnProperty.call(translations,source))return translations[source];
    return source;
  }

  const dynamicPairs=[
    {
      en:/^(\d+) matching fans?$/i,
      tr:/^(\d+) uygun fan$/i,
      enOut:m=>`${m[1]} matching fans`,
      trOut:m=>`${m[1]} uygun fan`
    },
    {
      en:/^Showing (\d+) of (\d+) projects$/i,
      tr:/^(\d+) \/ (\d+) proje gösteriliyor$/i,
      enOut:m=>`Showing ${m[1]} of ${m[2]} projects`,
      trOut:m=>`${m[1]} / ${m[2]} proje gösteriliyor`
    },
    {
      en:/^(\d+) products?$/i,
      tr:/^(\d+) ürün$/i,
      enOut:m=>`${m[1]} products`,
      trOut:m=>`${m[1]} ürün`
    },
    {
      en:/^(\d+) models?$/i,
      tr:/^(\d+) model$/i,
      enOut:m=>`${m[1]} models`,
      trOut:m=>`${m[1]} model`
    },
    {
      en:/^Page (\d+) \/ (\d+)$/i,
      tr:/^Sayfa (\d+) \/ (\d+)$/i,
      enOut:m=>`Page ${m[1]} / ${m[2]}`,
      trOut:m=>`Sayfa ${m[1]} / ${m[2]}`
    },
    {
      en:/^(\d+) units in project$/i,
      tr:/^Projede (\d+) adet$/i,
      enOut:m=>`${m[1]} units in project`,
      trOut:m=>`Projede ${m[1]} adet`
    },
    {
      en:/^Selected fans will be added to (.+)\.$/i,
      tr:/^Seçilen fanlar (.+) projesine eklenecek\.$/i,
      enOut:m=>`Selected fans will be added to ${m[1]}.`,
      trOut:m=>`Seçilen fanlar ${m[1]} projesine eklenecek.`
    },
    {
      en:/^(.+) quantity increased\.$/i,
      tr:/^(.+) adedi artırıldı\.$/i,
      enOut:m=>`${m[1]} quantity increased.`,
      trOut:m=>`${m[1]} adedi artırıldı.`
    },
    {
      en:/^Catalog model added to (.+)\.$/i,
      tr:/^Katalog modeli (.+) projesine eklendi\.$/i,
      enOut:m=>`Catalog model added to ${m[1]}.`,
      trOut:m=>`Katalog modeli ${m[1]} projesine eklendi.`
    }
  ];

  dynamicPairs.push(
    {en:/^(\d+) selected$/i,tr:/^(\d+) seçili$/i,enOut:m=>`${m[1]} selected`,trOut:m=>`${m[1]} seçili`},
    {en:/^(\d+) series$/i,tr:/^(\d+) seri$/i,enOut:m=>`${m[1]} series`,trOut:m=>`${m[1]} seri`},
    {en:/^(\d+) submodels?$/i,tr:/^(\d+) alt model$/i,enOut:m=>`${m[1]} submodels`,trOut:m=>`${m[1]} alt model`},
    {en:/^Showing all (\d+) projects$/i,tr:/^Toplam (\d+) proje gösteriliyor$/i,enOut:m=>`Showing all ${m[1]} projects`,trOut:m=>`Toplam ${m[1]} proje gösteriliyor`},
    {en:/^Contact: (.+)$/i,tr:/^İlgili: (.+)$/i,enOut:m=>`Contact: ${m[1]}`,trOut:m=>`İlgili: ${m[1]}`},
    {en:/^New Project (\d+)$/i,tr:/^Yeni Proje (\d+)$/i,enOut:m=>`New Project ${m[1]}`,trOut:m=>`Yeni Proje ${m[1]}`},
    {en:/^(.+)% applied to every product\.$/i,tr:/^Tüm ürünlere (.+)% uygulandı\.$/i,enOut:m=>`${m[1]}% applied to every product.`,trOut:m=>`Tüm ürünlere ${m[1]}% uygulandı.`},
    {en:/^Fan added to (.+)\.$/i,tr:/^Fan (.+) projesine eklendi\.$/i,enOut:m=>`Fan added to ${m[1]}.`,trOut:m=>`Fan ${m[1]} projesine eklendi.`},
    {en:/^Brand: (.+)$/i,tr:/^Marka: (.+)$/i,enOut:m=>`Brand: ${m[1]}`,trOut:m=>`Marka: ${m[1]}`},
    {en:/^Delete "(.+)" and all of its project products\?$/i,tr:/^"(.+)" projesi ve içindeki tüm ürünler silinsin mi\?$/i,enOut:m=>`Delete "${m[1]}" and all of its project products?`,trOut:m=>`"${m[1]}" projesi ve içindeki tüm ürünler silinsin mi?`},
    {en:/^Project Datasheet Appendix\s*•\s*Page (\d+) \/ (\d+)$/i,tr:/^Proje Teknik Föy Eki\s*•\s*Sayfa (\d+) \/ (\d+)$/i,enOut:m=>`Project Datasheet Appendix • Page ${m[1]} / ${m[2]}`,trOut:m=>`Proje Teknik Föy Eki • Sayfa ${m[1]} / ${m[2]}`},
    {en:/^Custom Product Appendix\s*•\s*Page (\d+) \/ (\d+)$/i,tr:/^Özel Ürün Eki\s*•\s*Sayfa (\d+) \/ (\d+)$/i,enOut:m=>`Custom Product Appendix • Page ${m[1]} / ${m[2]}`,trOut:m=>`Özel Ürün Eki • Sayfa ${m[1]} / ${m[2]}`}
  );

  function translatePattern(value,lang=currentLanguage){
    const text=String(value||'').trim();
    if(!text)return text;
    const exact=translateExact(text,lang);
    if(exact!==text||Object.prototype.hasOwnProperty.call(translations,text)||Object.prototype.hasOwnProperty.call(reverse,text))return exact;
    for(const pair of dynamicPairs){
      let match=text.match(pair.en);
      if(match)return lang==='tr'?pair.trOut(match):pair.enOut(match);
      match=text.match(pair.tr);
      if(match)return lang==='tr'?pair.trOut(match):pair.enOut(match);
    }
    return text;
  }

  function replaceTrimmed(original,replacement){
    const text=String(original||'');
    const start=text.match(/^\s*/)?.[0]||'';
    const end=text.match(/\s*$/)?.[0]||'';
    return start+replacement+end;
  }

  function translateTextNode(node){
    if(!node||node.nodeType!==Node.TEXT_NODE||ignoredParents.has(node.parentElement?.tagName))return;
    const clean=String(node.nodeValue||'').trim();
    if(!clean)return;
    const next=translatePattern(clean,currentLanguage);
    if(next!==clean)node.nodeValue=replaceTrimmed(node.nodeValue,next);
  }

  function translateAttributes(element){
    if(!element||element.nodeType!==Node.ELEMENT_NODE)return;
    attributes.forEach(name=>{
      if(!element.hasAttribute(name))return;
      const value=element.getAttribute(name)||'';
      const next=translatePattern(value,currentLanguage);
      if(next!==value)element.setAttribute(name,next);
    });
  }

  function apply(root=document){
    if(applying)return;
    applying=true;
    try{
      document.documentElement.lang=currentLanguage;
      if(root.nodeType===Node.TEXT_NODE){translateTextNode(root);return}
      if(root.nodeType===Node.ELEMENT_NODE)translateAttributes(root);
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
      let node;
      while((node=walker.nextNode())){
        if(node.nodeType===Node.TEXT_NODE)translateTextNode(node);
        else translateAttributes(node);
      }
      updateSelector();
    }finally{applying=false}
  }

  function setLanguage(lang){
    if(lang!=='en'&&lang!=='tr')return;
    currentLanguage=lang;
    try{localStorage.setItem(STORAGE_KEY,lang)}catch{}
    apply(document);
    window.dispatchEvent(new CustomEvent('vensis-language-changed',{detail:{language:lang}}));
  }

  function installDialogTranslation(){
    if(window.__vensisI18nDialogsInstalled)return;
    window.__vensisI18nDialogsInstalled=true;
    const nativeAlert=window.alert.bind(window);
    const nativeConfirm=window.confirm.bind(window);
    const nativePrompt=window.prompt.bind(window);
    window.alert=value=>nativeAlert(translatePattern(String(value??''),currentLanguage));
    window.confirm=value=>nativeConfirm(translatePattern(String(value??''),currentLanguage));
    window.prompt=(value,defaultValue)=>nativePrompt(translatePattern(String(value??''),currentLanguage),defaultValue);
  }

  function selectorTarget(){
    return document.querySelector('.app-nav,.catalog-nav,.nav,.toolbar');
  }

  function mountSelector(){
    if(document.getElementById('vensisLanguageSwitch')){updateSelector();return}
    const target=selectorTarget();
    if(!target)return;
    if(!document.getElementById('vensisLanguageStyles')){
      const style=document.createElement('style');
      style.id='vensisLanguageStyles';
      style.textContent='.vensis-language-switch{display:inline-flex;align-items:center;gap:2px;min-height:36px;padding:3px;border:1px solid #cbdad4;border-radius:9px;background:#fff;white-space:nowrap}.vensis-language-switch button{min-width:36px!important;min-height:28px!important;border:0!important;border-radius:6px!important;padding:5px 8px!important;background:transparent!important;color:#52666b!important;font:800 11px Arial,Helvetica,sans-serif!important;cursor:pointer!important;box-shadow:none!important}.vensis-language-switch button.active{background:#087f4f!important;color:#fff!important}.vensis-language-switch button:focus-visible{outline:2px solid #087f4f;outline-offset:1px}@media print{.vensis-language-switch{display:none!important}}';
      document.head.appendChild(style);
    }
    const wrap=document.createElement('div');
    wrap.id='vensisLanguageSwitch';
    wrap.className='vensis-language-switch';
    wrap.setAttribute('aria-label','Language / Dil');
    wrap.innerHTML='<button type="button" data-lang="en" aria-label="English">EN</button><button type="button" data-lang="tr" aria-label="Türkçe">TR</button>';
    wrap.addEventListener('click',event=>{
      const button=event.target.closest('[data-lang]');
      if(button)setLanguage(button.dataset.lang);
    });
    target.appendChild(wrap);
    updateSelector();
  }

  function updateSelector(){
    const wrap=document.getElementById('vensisLanguageSwitch');
    if(!wrap)return;
    wrap.querySelectorAll('[data-lang]').forEach(button=>{
      const active=button.dataset.lang===currentLanguage;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  function observe(){
    if(observer||!document.documentElement)return;
    observer=new MutationObserver(mutations=>{
      if(applying)return;
      let shouldMount=false;
      mutations.forEach(mutation=>{
        if(mutation.type==='characterData')translateTextNode(mutation.target);
        mutation.addedNodes.forEach(node=>{
          if(node.nodeType===Node.TEXT_NODE)translateTextNode(node);
          else if(node.nodeType===Node.ELEMENT_NODE){apply(node);shouldMount=true}
        });
        if(mutation.type==='attributes'&&mutation.target)translateAttributes(mutation.target);
      });
      if(shouldMount&&!document.getElementById('vensisLanguageSwitch'))mountSelector();
    });
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
  }

  function init(){
    installDialogTranslation();
    apply(document);
    mountSelector();
    observe();
  }

  window.VensisI18n={
    setLanguage,
    getLanguage:()=>currentLanguage,
    t:(value,lang=currentLanguage)=>translatePattern(value,lang),
    apply,
    translations
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
