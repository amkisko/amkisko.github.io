#!/usr/bin/env ruby
# frozen_string_literal: true

require 'time'
require 'fileutils'
require 'cgi'
require 'nokogiri'

# Get title and description from command line arguments or prompt
title = ARGV[0]
description = ARGV[1]

# Prompt for title if not provided
if title.nil? || title.empty?
  print "Enter post title: "
  title = $stdin.gets.chomp
end

# Prompt for description if not provided
if description.nil? || description.empty?
  print "Enter post description: "
  description = $stdin.gets.chomp
end

# Validate inputs
if title.empty?
  puts "Error: Title cannot be empty"
  exit 1
end

if description.empty?
  puts "Error: Description cannot be empty"
  exit 1
end

# Generate datetime prefix (YYYYMMDDHHMMSS)
now = Time.now
datetime_prefix = now.strftime("%Y%m%d%H%M%S")

# Generate slug from title (lowercase, replace spaces with underscores, remove special chars)
slug = title.downcase
            .gsub(/[^a-z0-9\s-]/, '')  # Remove special characters except spaces and hyphens
            .gsub(/\s+/, '_')          # Replace spaces with underscores
            .gsub(/-+/, '_')            # Replace hyphens with underscores
            .gsub(/_+/, '_')            # Replace multiple underscores with single
            .gsub(/^_|_$/, '')         # Remove leading/trailing underscores

# Generate filename
filename = "#{datetime_prefix}_#{slug}.html"
posts_dir = File.join(__dir__, '..', '..', 'posts')
filepath = File.join(posts_dir, filename)

# Check if file already exists
if File.exist?(filepath)
  puts "Error: File already exists: #{filepath}"
  exit 1
end

# Format date for article (e.g., "1 December 2025, Helsinki, Åndrei Makarov")
formatted_date = now.strftime("%-d %B %Y")
date_string = "#{formatted_date}, Helsinki, Åndrei Makarov"

# Format datetime for meta tags (ISO 8601)
iso_datetime = now.utc.strftime("%Y-%m-%dT%H:%M:%S+00:00")

# Format date for sitemap (YYYY-MM-DD)
sitemap_date = now.strftime("%Y-%m-%d")

# Format date for posts.html (e.g., "December 1, 2025")
posts_date = now.strftime("%B %-d, %Y")

# Generate URL
url = "https://amkisko.github.io/posts/#{filename}"

# Escape function for HTML string interpolation
def html_escape(text)
  CGI.escapeHTML(text)
end

# Generate keywords (basic extraction from title and description)
keywords = (title + " " + description)
           .downcase
           .split(/\s+/)
           .reject { |w| w.length < 4 }
           .uniq
           .first(10)
           .join(", ")

# Generate HTML content
html_content = <<~HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>#{html_escape(title)}</title>
    <meta name="description" content="#{html_escape(description)}">
    <meta name="keywords" content="#{html_escape(keywords)}">
    <meta name="author" content="Åndrei Makarov">
    <meta name="robots" content="index, follow">
    <meta property="og:title" content="#{html_escape(title)}">
    <meta property="og:description" content="#{html_escape(description)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="#{url}">
    <meta property="article:published_time" content="#{iso_datetime}">
    <meta property="article:modified_time" content="#{iso_datetime}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="#{html_escape(title)}">
    <meta name="twitter:description" content="#{html_escape(description)}">
    <link rel="stylesheet" href="../styles/posts_text.css">
    <link rel="stylesheet" href="../styles/posts_navigation.css">
</head>
<body>
    <a href="../posts.html" id="map-link" title="Map"></a>
    <article>
        <h1>#{html_escape(title)}</h1>
        <div class="date">#{date_string}</div>

        <p>#{html_escape(description)}</p>

        <!-- Add your content here -->

    </article>
    <a href="#" id="to-top" title="To the top"></a>

    <script src="../scripts/posts_navigation.js"></script>
</body>
</html>
HTML

# Ensure posts directory exists
FileUtils.mkdir_p(posts_dir)

# Write the file
File.write(filepath, html_content)

# Update sitemap.xml
sitemap_path = File.join(__dir__, '..', '..', 'sitemap.xml')
if File.exist?(sitemap_path)
  doc = Nokogiri::XML(File.read(sitemap_path))
  doc.encoding = 'UTF-8'

  # Find the posts.html url entry
  posts_url = doc.at_xpath("//url[loc[text()='https://amkisko.github.io/posts.html']]")

  if posts_url
    # Create new url entry
    new_url = Nokogiri::XML::Node.new('url', doc)
    new_url.add_child("<loc>#{url}</loc>")
    new_url.add_child("<lastmod>#{sitemap_date}</lastmod>")
    new_url.add_child("<changefreq>monthly</changefreq>")
    new_url.add_child("<priority>0.8</priority>")

    # Insert after posts.html entry
    posts_url.add_next_sibling(new_url)
  end

  # Write back with proper formatting
  File.write(sitemap_path, doc.to_xml(indent: 2))
  puts "Updated sitemap.xml"
end

# Update posts.html
posts_html_path = File.join(__dir__, '..', '..', 'posts.html')
if File.exist?(posts_html_path)
  doc = Nokogiri::HTML(File.read(posts_html_path))

  # Find the post-list ul element
  post_list = doc.at_css('ul.post-list')

  if post_list
    # Create new list item
    new_li = Nokogiri::XML::Node.new('li', doc)
    new_li['class'] = 'post-item'

    # Create title link
    title_link = Nokogiri::XML::Node.new('a', doc)
    title_link['href'] = "posts/#{filename}"
    title_link['class'] = 'post-title'
    title_link.content = title

    # Create date div
    date_div = Nokogiri::XML::Node.new('div', doc)
    date_div['class'] = 'post-date'
    date_div.content = posts_date

    # Create description paragraph
    desc_p = Nokogiri::XML::Node.new('p', doc)
    desc_p['class'] = 'post-description'
    desc_p.content = description

    # Assemble the list item
    new_li.add_child(title_link)
    new_li.add_child(date_div)
    new_li.add_child(desc_p)

    # Insert as first child of post-list
    post_list.prepend_child(new_li)
  end

  # Write back with proper formatting
  File.write(posts_html_path, doc.to_html(indent: 4))
  puts "Updated posts.html"
end

# Update feed.xml
feed_path = File.join(__dir__, '..', '..', 'feed.xml')
if File.exist?(feed_path)
  doc = Nokogiri::XML(File.read(feed_path))
  doc.encoding = 'UTF-8'

  # Update the feed updated timestamp
  updated_node = doc.at_xpath('//feed/updated')
  updated_node.content = iso_datetime if updated_node

  # Find the author element
  author = doc.at_xpath('//feed/author')

  if author
    # Create new entry
    new_entry = Nokogiri::XML::Node.new('entry', doc)

    title_node = Nokogiri::XML::Node.new('title', doc)
    title_node.content = title
    new_entry.add_child(title_node)

    link_node = Nokogiri::XML::Node.new('link', doc)
    link_node['href'] = url
    new_entry.add_child(link_node)

    id_node = Nokogiri::XML::Node.new('id', doc)
    id_node.content = url
    new_entry.add_child(id_node)

    updated_entry_node = Nokogiri::XML::Node.new('updated', doc)
    updated_entry_node.content = iso_datetime
    new_entry.add_child(updated_entry_node)

    published_node = Nokogiri::XML::Node.new('published', doc)
    published_node.content = iso_datetime
    new_entry.add_child(published_node)

    summary_node = Nokogiri::XML::Node.new('summary', doc)
    summary_node.content = description
    new_entry.add_child(summary_node)

    # Insert after author section
    author.add_next_sibling(new_entry)
  end

  # Write back with proper formatting
  File.write(feed_path, doc.to_xml(indent: 2))
  puts "Updated feed.xml"
end

puts "\nCreated new post: #{filepath}"
puts "Title: #{title}"
puts "Description: #{description}"
puts "Slug: #{slug}"
puts "Datetime prefix: #{datetime_prefix}"
puts "\nAll files updated successfully!"
