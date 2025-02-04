const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

const REPO_NAME = 'Static-Site'; // Make sure this matches your GitHub repository name exactly
const isDev = process.env.NODE_ENV === 'development';
const OUTPUT_DIR = isDev ? 'public' : 'docs';
const basePath = isDev ? '' : `/${REPO_NAME}`;

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function fixPaths(content) {
  // First normalize all paths to use single slashes
  content = content.replace(/([^:])\/+/g, '$1/');
  
  // Remove base tag if it exists
  content = content.replace(/<base[^>]*>/g, '');
  
  // Fix paths in href and src attributes
  content = content.replace(/(href|src)=["']([^"']+)["']/g, (match, attr, path) => {
    // Skip external URLs and anchors
    if (path.startsWith('http') || path.startsWith('#')) {
      return match;
    }
    
    // Remove any existing basePath and normalize slashes
    path = path.replace(new RegExp(basePath, 'g'), '');
    path = path.replace(/^\/+/, '').replace(/\/+/g, '/');
    
    // Add basePath to the normalized path
    return `${attr}="${basePath}/${path}"`;
  });
  
  return content;
}

async function buildPage(template, content, metadata = null) {
  // Process content first
  let processedContent = content;
  
  if (metadata) {
    // Read newsletter partial
    const newsletterPartial = await fs.readFile('src/templates/partials/newsletter.html', 'utf-8');
    
    // Add article header and newsletter form for blog posts
    processedContent = `
      <article class="blog-post">
        <header class="post-header">
          <div class="post-meta">Published on ${formatDate(metadata.date)}</div>
          <h1>${metadata.title}</h1>
          ${metadata.author ? `
            <div class="author-info">
              By ${metadata.author}
              ${metadata.bio ? `<br>${metadata.bio}` : ''}
            </div>
          ` : ''}
        </header>
        ${content}
        <footer>
          <a href="#" class="share-button">
            Share this article
          </a>
        </footer>
      </article>
      ${newsletterPartial}
    `;
  } else {
    processedContent = `<div class="blog-post">${content}</div>`;
  }
  
  // Fix paths in the content
  processedContent = fixPaths(processedContent);
  
  // Process the template with the correct paths
  let finalHtml = template
    .replace('{{content}}', processedContent)
    .replace('{{title}}', metadata?.title || 'Part-Time YouTuber Academy');
  
  // Fix paths in the final HTML
  finalHtml = fixPaths(finalHtml);
  
  return finalHtml;
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
    <div class="blog-post">
      <h1>Blog Posts</h1>
      <ul class="blog-list">
        ${blogFiles.map(file => {
          const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
          const { data } = matter(content);
          const postName = file.replace('.md', '');
          return `<li>
            <a href="blog/${postName}.html">${data.title || postName}</a>
            <small>${formatDate(data.date)}</small>
          </li>`;
        }).join('\n')}
      </ul>
    </div>
  `;
  
  const blogIndexHtml = await buildPage(template, blogIndexContent);
  await fs.writeFile(`${OUTPUT_DIR}/blog/index.html`, blogIndexHtml);
  
  // Process blog posts
  for (const file of blogFiles) {
    const content = await fs.readFile(path.join(blogDir, file), 'utf-8');
    const { data, content: markdownContent } = matter(content);
    const htmlContent = marked(markdownContent);
    
    const blogPost = await buildPage(template, htmlContent, data);
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