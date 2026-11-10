# EasyFindStore retail featured-product filters

The homepage featured-product filters now use stable retail departments: All products, Fashion, Electronics, Home & Kitchen, Beauty & Care, Sports & Fitness, Books & More, Kids & Toys, and Lifestyle. The filters change both the collection-preview cards and live backend product cards.

Existing pooja-store inventory (e.g. camphor, religious frames, puja materials) is excluded from **the homepage featured area**. The rest of the application and its source data are unchanged. Live products only appear in a department when their names or category labels match that retail department. The preview cards have no fictitious price or add-to-cart action.

To permanently remove old inventory from the store catalogue, edit/delete the original products/categories in the backend admin (and add new retail listings). Frontend changes do not overwrite or migrate database records.

Product routing checks: `npm run test:product-links`.
