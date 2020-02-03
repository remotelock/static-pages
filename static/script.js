function handleChange(e) {
  if (e.matches) {
    document.querySelector('html').classList.add('dark');
  } else {
    document.querySelector('html').classList.remove('dark');
  }
}
const query = matchMedia('(prefers-color-scheme: dark)');
query.addListener(handleChange);
handleChange(query);
