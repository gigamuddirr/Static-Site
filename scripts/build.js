const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

const REPO_NAME = 'Static-Site'; // Make sure this matches your GitHub repository name exactly
const isDev = process.env.NODE_ENV === 'development';
const OUTPUT_DIR = isDev ? 'public' : 'docs';
const basePath = isDev ? '' : `/${REPO_NAME}`;

async function buildPage(template, content) {
  // Process content first
  const processedContent = content.replace(/(href|src)="\//g, `$1="${basePath}/`);
  
  // Then process the template with the correct paths
  return template
    .replace('{{content}}', processedContent)
    .replace('{{title}}', 'Part-Time YouTuber Academy')
    .replace(/(href|src)="\//g, `$1="${basePath}/`);
}

async function build() {
  // Create output directories
  await fs.ensureDir(OUTPUT_DIR);
  await fs.ensureDir(`${OUTPUT_DIR}/blog`);
  await fs.ensureDir(`${OUTPUT_DIR}/styles`);
  await fs.ensureDir(`${OUTPUT_DIR}/images`);
  
  // Copy static assets
  await fs.copy('src/styles', `${OUTPUT_DIR}/styles`);
  await fs.copy('src/images', `${OUTPUT_DIR}/images`);
  
  // Read template
  const template = await fs.readFile('src/templates/main.html', 'utf-8');
  
  // Handle index.html specially
  const indexContent = await fs.readFile('src/index.html', 'utf-8');
  const mainContentMatch = indexContent.match(/<main>([\s\S]*?)<\/main>/);
  const mainContent = mainContentMatch ? mainContentMatch[1] : '<h1>Welcome</h1>';
  const indexHtml = await buildPage(template, mainContent);
  await fs.writeFile(`${OUTPUT_DIR}/index.html`, indexHtml);
  
  // Build blog posts
  const blogDir = path.join('src', 'content', 'blog');
  const blogFiles = await fs.readdir(blogDir);
  
  // Build blog index
  const blogIndexContent = `
    <h1>Blog Posts</h1>
    <ul class="blog-list">
      ${blogFiles.map(file => {
        const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
        const { data } = matter(content);
        const postName = file.replace('.md', '');
        return `<li>
          <a href="${basePath}/blog/${postName}.html">${data.title || postName}</a>
          ${data.date ? `<small>(${new Date(data.date).toLocaleDateString()})</small>` : ''}
        </li>`;
      }).join('\n')}
    </ul>
  `;
  
  const blogIndexHtml = await buildPage(template, blogIndexContent);
  await fs.writeFile(`${OUTPUT_DIR}/blog/index.html`, blogIndexHtml);
  
  // Process blog posts
  for (const file of blogFiles) {
    const content = await fs.readFile(path.join(blogDir, file), 'utf-8');
    const { data, content: markdownContent } = matter(content);
    const htmlContent = marked(markdownContent);
    
    const blogPost = await buildPage(template, htmlContent);
    const outFile = path.join(OUTPUT_DIR, 'blog', file.replace('.md', '.html'));
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
    const outFile = path.join(OUTPUT_DIR, file.replace('.md', '.html'));
    await fs.writeFile(outFile, page);
  }
}

build().catch(console.error); 