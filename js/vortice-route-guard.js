(function(){
  'use strict';
  const path=(location.pathname||'').toLowerCase();
  if(!path.endsWith('/catalog-vortice.html'))return;
  const params=new URLSearchParams(location.search);
  if(params.get('series'))return;
  location.replace('catalog-vortice-stable.html'+(location.search||''));
})();
