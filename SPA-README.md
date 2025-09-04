# Trimark Industries - Single-Page Application (SPA)

## 🚀 What's New

Your website has been converted from multiple HTML files to a **Single-Page Application (SPA)** that provides:

- ✅ **Clean URLs** - No more `.html` extensions
- ✅ **Better Security** - All authentication in one place
- ✅ **Faster Navigation** - No page reloads
- ✅ **Modern Architecture** - Professional web app feel

## 🌐 URL Examples

**Before (Old URLs):**
- `yourdomain.com/home.html`
- `yourdomain.com/about.html`
- `yourdomain.com/roles.html`

**After (Clean URLs):**
- `yourdomain.com/home`
- `yourdomain.com/about`
- `yourdomain.com/roles`

## 📁 New File Structure

```
Trimark-Website/
├── app.html              # Main SPA application
├── index.html            # Redirect to SPA
├── .htaccess             # Apache server configuration
├── styles.css            # Your existing styles
├── script.js             # Your existing JavaScript
└── [other assets...]
```

## 🚀 How to Deploy

### Option 1: Apache Server (Most Common)
1. Upload all files to your web hosting
2. The `.htaccess` file will automatically:
   - Remove `.html` extensions
   - Handle clean URLs
   - Redirect all requests to your SPA

### Option 2: Nginx Server
If you're using Nginx, add this to your server block:

```nginx
location / {
    try_files $uri $uri.html $uri/ =404;
}

# Handle SPA routing
location ~ ^/(home|about|ore-sites|roles|members|events|logs|security|logistics|manufacturing)$ {
    try_files $uri $uri.html /app.html;
}
```

### Option 3: Other Servers
For other servers, you'll need to configure URL rewriting to:
- Remove `.html` extensions
- Route all non-file requests to `app.html`

## 🔒 Security Features Maintained

- ✅ Wallet authentication required
- ✅ Tribe membership verification
- ✅ Session timeout protection
- ✅ All existing security measures

## 🎯 How It Works

1. **User visits** `yourdomain.com/home`
2. **Server rewrites** URL to `app.html`
3. **JavaScript router** detects the route (`/home`)
4. **Content loads** dynamically without page reload
5. **URL stays clean** - no `.html` extension

## 🧪 Testing Locally

1. **Open** `app.html` in your browser
2. **Navigate** using the navigation menu
3. **Check URLs** - they should show clean routes like `#/home`, `#/about`
4. **Test authentication** - wallet connection should work as before

## 🔧 Customization

### Adding New Pages
1. Add new template in `app.html`:
```html
<template id="newPageTemplate">
    <div class="new-page-content">
        <h2>New Page</h2>
        <p>Your content here</p>
    </div>
</template>
```

2. Add route in the JavaScript:
```javascript
this.routes = {
    // ... existing routes
    'new-page': 'newPageTemplate'
};
```

3. Add navigation link:
```html
<a href="#/new-page" class="nav-link" data-route="new-page">New Page</a>
```

### Styling
- All existing CSS classes work the same
- Add new styles to `styles.css`
- Use the same design system

## 🚨 Important Notes

- **Keep `app.html`** as your main file
- **Don't delete** `styles.css` or `script.js`
- **Upload `.htaccess`** for clean URLs
- **Test thoroughly** before going live

## 🆘 Troubleshooting

### URLs Still Show .html
- Check if `.htaccess` is uploaded
- Verify server supports URL rewriting
- Contact hosting provider about mod_rewrite

### Pages Not Loading
- Check browser console for errors
- Verify all files are uploaded
- Test with `app.html` directly

### Authentication Issues
- Check `script.js` is loaded
- Verify wallet connection logic
- Test with existing authentication flow

## 🎉 Benefits

- **Professional URLs** like other major websites
- **Better SEO** - cleaner URL structure
- **Improved UX** - faster navigation
- **Easier Maintenance** - one file to update
- **Enhanced Security** - centralized authentication

Your website now has the same professional feel as sites like `docs.evefrontier.com` with clean, modern URLs!

