const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const matter = require('gray-matter');

async function buildPage(template, content) {
  return template.replace('{{content}}', content)
                .replace('{{title}}', 'My Website'); // You can make this dynamic later
}

async function build() {
  // Create output directories
  await fs.ensureDir('public');
  await fs.ensureDir('public/blog');
  
  // Copy static assets
  await fs.copy('src/styles', 'public/styles');
  
  // Read template
  const template = await fs.readFile('src/templates/main.html', 'utf-8');
  
  // Create index.html
  const indexContent = `
    <h1>Welcome to My Website</h1>
    <p>This is the landing page.</p>
  `;
  const indexHtml = await buildPage(template, indexContent);
  await fs.writeFile('public/index.html', indexHtml);
  
  // Build blog posts
  const blogDir = path.join('src', 'content', 'blog');
  const blogFiles = await fs.readdir(blogDir);
  
  for (const file of blogFiles) {
    const content = await fs.readFile(path.join(blogDir, file), 'utf-8');
    const { data, content: markdownContent } = matter(content);
    const htmlContent = marked(markdownContent);
    
    const blogPost = await buildPage(template, htmlContent);
    const outFile = path.join('public', 'blog', file.replace('.md', '.html'));
    await fs.writeFile(outFile, blogPost);
  }
  
  // Build pages
  const pagesDir = path.join('src', 'content', 'pages');
  const pageFiles = await fs.readdir(pagesDir);
  
  for (const file of pageFiles) {
    const content = await fs.readFile(path.join(pagesDir, file), 'utf-8');
    const { data, content: markdownContent } = matter(content);
    const htmlContent = marked(markdownContent);
    
    const page = await buildPage(template, htmlContent);
    const outFile = path.join('public', file.replace('.md', '.html'));
    await fs.writeFile(outFile, page);
  }
}

build().catch(console.error); 