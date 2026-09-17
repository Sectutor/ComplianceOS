(function() {
  // Update document metadata
  document.title = "GRCompliance Assistant";

  function applyDynamicBranding() {
    // 1. Hide only the blacklisted navigation items in aside/header
    const blacklist = [
      '/profiles', '/config', '/keys', '/system', '/webhooks', 
      '/mcp', '/achievements', 
      '/settings', '/analytics', '/documentation', '/logs'
    ];
    
    const elements = document.querySelectorAll('aside a, aside button, header a, header button');
    elements.forEach(el => {
      const href = (el.getAttribute('href') || '').toLowerCase();
      const text = (el.textContent || '').trim().toLowerCase();
      const title = (el.getAttribute('title') || '').trim().toLowerCase();
      
      // If the link matches any blacklist path, hide it
      const shouldHide = blacklist.some(path => href.includes(path) || title.includes(path));
      
      if (shouldHide) {
        el.style.setProperty('display', 'none', 'important');
      }
    });

    // 2. Logo replacement in Sidebar Header
    const titleEl = document.querySelector('aside .tracking-\\[0\\.0525rem\\]');
    if (titleEl) {
      const parent = titleEl.parentElement;
      if (parent && !parent.querySelector('.grcompliance-logo')) {
        // Clear parent and add logo
        parent.innerHTML = '';
        const img = document.createElement('img');
        img.className = 'grcompliance-logo';
        img.src = '/assets/logo.png';
        img.alt = 'GRCompliance Logo';
        img.style.height = '32px';
        img.style.width = 'auto';
        img.style.objectFit = 'contain';
        img.style.transition = 'all 0.3s ease';
        parent.appendChild(img);
        
        // Align left and add padding
        parent.style.justifyContent = 'flex-start';
        parent.style.paddingLeft = '12px';
      }
    }

    // 3. Walk and rebrand text nodes in the sidebar
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      walkTextNodes(sidebar);
    }

    // 4. Walk and rebrand text nodes in the header
    const header = document.querySelector('header');
    if (header) {
      walkTextNodes(header);
    }

    // 5. Rebrand input/textarea placeholders
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(el => {
      if (el.placeholder && el.placeholder.includes('Hermes')) {
        el.placeholder = el.placeholder.replace(/Hermes/g, 'GRCompliance Assistant');
      }
    });
  }

  function walkTextNodes(node) {
    if (node.nodeType === 3) {
      if (node.nodeValue && node.nodeValue.includes('Hermes')) {
        node.nodeValue = node.nodeValue.replace(/Hermes/g, 'GRCompliance Assistant');
      }
    } else {
      const tagName = node.tagName ? node.tagName.toLowerCase() : '';
      if (tagName !== 'script' && tagName !== 'style') {
        for (let i = 0; i < node.childNodes.length; i++) {
          walkTextNodes(node.childNodes[i]);
        }
      }
    }
  }

  // Hook into DOM changes so React rerenders don't restore default headers/menus
  applyDynamicBranding();
  const observer = new MutationObserver(applyDynamicBranding);
  observer.observe(document.body, { childList: true, subtree: true });
})();
