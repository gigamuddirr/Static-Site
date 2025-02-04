const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

async function buildPage(template, content) {
  return template.replace('{{content}}', content)
                .replace('{{title}}', 'Part-Time YouTuber Academy');
}

async function build() {
  // Create output directories
  await fs.ensureDir('public');
  await fs.ensureDir('public/blog');
  
  // Copy static assets
  await fs.copy('src/styles', 'public/styles');
  await fs.copy('src/images', 'public/images');
  
  // Read template
  const template = await fs.readFile('src/templates/main.html', 'utf-8');
  
  // Handle index.html specially - read the content between <main> tags
  const indexContent = await fs.readFile('src/index.html', 'utf-8');
  const mainContentMatch = indexContent.match(/<main>([\s\S]*?)<\/main>/);
  const mainContent = mainContentMatch ? mainContentMatch[1] : '<h1>Welcome to My Website</h1><p>This is the landing page.</p>';
  const indexHtml = await buildPage(template, mainContent);
  await fs.writeFile('public/index.html', indexHtml);
  
  // Build blog posts
  const blogDir = path.join('src', 'content', 'blog');
  const blogFiles = await fs.readdir(blogDir);
  
  // Build blog index page
  const blogIndexContent = `
    <h1>Blog Posts</h1>
    <ul>
      ${blogFiles.map(file => {
        const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
        const { data } = matter(content);
        const postName = file.replace('.md', '');
        return `<li>
          <a href="/blog/${postName}.html">${data.title || postName}</a>
          ${data.date ? `<small>(${data.date})</small>` : ''}
        </li>`;
      }).join('\n')}
    </ul>
  `;
  
  const blogIndexHtml = await buildPage(template, blogIndexContent);
  await fs.writeFile('public/blog/index.html', blogIndexHtml);
  
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