const examples=JSON.parse(document.getElementById('examples').textContent);
for(const button of document.querySelectorAll('[data-example]'))button.addEventListener('click',()=>{
 const example=examples[Number(button.dataset.example)];
 document.getElementById('source').textContent=example.source;
 document.getElementById('generated').textContent=example.output;
 for(const other of document.querySelectorAll('[data-example]'))other.setAttribute('aria-pressed',String(other===button));
});
