const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

const REPO_NAME = 'Static-Site'; // Update this to match your repository name

async function buildPage(template, content) {
  // Add base path to all URLs
  const processedContent = content.replace(/(href|src)="\//g, `$1="/${REPO_NAME}/`);
  return template.replace('{{content}}', processedContent)
                .replace('{{title}}', 'Part-Time YouTuber Academy');
}

async function build() {
  const isDev = process.env.NODE_ENV === 'development';
  const basePath = isDev ? '' : '/Static-Site';
  
  // Create output directories
  await fs.ensureDir('docs');
  await fs.ensureDir('docs/blog');
  
  // Copy static assets
  await fs.copy('src/styles', 'docs/styles');
  await fs.copy('src/images', 'docs/images');
  
  // Read template
  const template = await fs.readFile('src/templates/main.html', 'utf-8')
    .then(content => {
      return content.replace(/href="\/Static-Site\//g, `href="${basePath}/`)
                   .replace(/src="\/Static-Site\//g, `src="${basePath}/`);
    });
  
  // Handle index.html specially
  const indexContent = await fs.readFile('src/index.html', 'utf-8');
  const mainContentMatch = indexContent.match(/<main>([\s\S]*?)<\/main>/);
  const mainContent = mainContentMatch ? mainContentMatch[1] : '<h1>Welcome</h1>';
  const indexHtml = template.replace('{{content}}', mainContent);
  await fs.writeFile('docs/index.html', indexHtml);
  
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
  await fs.writeFile('blog/index.html', blogIndexHtml);
  
  for (const file of blogFiles) {
    const content = await fs.readFile(path.join(blogDir, file), 'utf-8');
    const { data, content: markdownContent } = matter(content);
    const htmlContent = marked(markdownContent);
    
    const blogPost = await buildPage(template, htmlContent);
    const outFile = path.join('blog', file.replace('.md', '.html'));
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
    const outFile = path.join('.', file.replace('.md', '.html'));
    await fs.writeFile(outFile, page);
  }
}

build().catch(console.error); 