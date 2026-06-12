#!/usr/bin/env ruby
# frozen_string_literal: true

require "cgi"
require "fileutils"
require "optparse"
require "time"

begin
  require "nokogiri"
rescue LoadError
  warn "nokogiri is required: gem install nokogiri"
  exit 1
end

SCRIPT_DIR = File.expand_path(__dir__)
ROOT_DIR = File.expand_path("..", SCRIPT_DIR)
POSTS_DIR = File.join(ROOT_DIR, "posts")

SKIP_SELECTORS = %w[
  script style canvas noscript
  #map-link #to-top
  .doc-class
].freeze

class PostMarkdownConverter
  def initialize(html_path)
    @html_path = html_path
    @doc = Nokogiri::HTML(File.read(html_path, encoding: "UTF-8"))
    @meta = extract_meta
    @content_root = find_content_root
  end

  def to_markdown
    lines = []
    lines << front_matter
    lines << ""
    lines.concat(body_lines)
    normalize_output(lines.join("\n"))
  end

  private

  def extract_meta
    head = @doc.at("head")
    {
      title: meta_content(head, "title") || title_from_body,
      description: meta_content(head, "description"),
      published: meta_content(head, "article:published_time"),
      modified: meta_content(head, "article:modified_time"),
      url: meta_content(head, "og:url") || default_url
    }
  end

  def meta_content(head, name)
    return nil unless head

    node = head.at("meta[name='#{name}']") ||
           head.at("meta[property='#{name}']") ||
           (name == "title" ? head.at("title") : nil)
    text = node&.[]("content") || node&.text
    text&.strip&.empty? ? nil : text&.strip
  end

  def title_from_body
    @doc.at("article h1, .maketitle h1, h1")&.text&.strip
  end

  def default_url
    "https://amkisko.github.io/posts/#{File.basename(@html_path)}"
  end

  def find_content_root
    @doc.at("article .doc-body") ||
      @doc.at(".doc-body") ||
      @doc.at("article .tex-doc") ||
      @doc.at("article") ||
      @doc.at("body")
  end

  def front_matter
    lines = ["# #{@meta[:title]}"]
    lines << ""
    lines << "URL: #{@meta[:url]}"
    lines << "Description: #{@meta[:description]}" if @meta[:description]

    subtitle = @content_root&.at("p.subtitle")&.text&.strip
    lines << "Subtitle: #{subtitle}" if subtitle

    date = header_date
    lines << "Date: #{date}" if date

    author = @doc.at(".doc-author")&.text&.strip
    lines << "Author: #{author}" if author

    if @meta[:published]
      lines << "Published: #{@meta[:published]}"
    end
    if @meta[:modified] && @meta[:modified] != @meta[:published]
      lines << "Modified: #{@meta[:modified]}"
    end

    lines << ""
    lines << "---"
    lines
  end

  def header_date
    @doc.at(".doc-date")&.text&.strip ||
      @doc.at("div.date")&.text&.strip
  end

  def body_lines
    return [] unless @content_root

    lines = []
    @content_root.children.each do |node|
      next if skip_node?(node)
      next if skip_header_metadata?(node)

      converted = convert_node(node)
      lines.concat(Array(converted)) if converted
    end
    lines
  end

  def skip_node?(node)
    return true unless node.element?

    SKIP_SELECTORS.any? do |selector|
      node.matches?(selector)
    end
  end

  def skip_header_metadata?(node)
    return false unless node.element?

    case node.name
    when "h1"
      inline_text(node) == @meta[:title]
    when "div"
      node["class"]&.split&.include?("date")
    when "p"
      classes = node["class"]&.split || []
      classes.intersect?(%w[subtitle doc-author doc-date])
    when "header"
      node["class"]&.split&.include?("maketitle")
    else
      false
    end
  end

  def convert_node(node)
    case node.name
    when "h1" then heading(node, 1)
    when "h2" then heading(node, 2)
    when "h3" then heading(node, 3)
    when "h4" then heading(node, 4)
    when "h5" then heading(node, 5)
    when "h6" then heading(node, 6)
    when "p" then paragraph(node)
    when "ul", "ol" then list(node)
    when "pre" then code_block(node)
    when "blockquote" then blockquote(node)
    when "section", "div", "header", "article"
      section(node)
    when "dl" then definition_list(node)
    when "table" then table_as_text(node)
    else
      text = inline_text(node)
      text.empty? ? nil : ["", text, ""]
    end
  end

  def section(node)
    return nil if skip_node?(node)

    lines = []
    node.children.each do |child|
      next if skip_node?(child)

      converted = convert_node(child)
      lines.concat(Array(converted)) if converted
    end
    lines.empty? ? nil : lines
  end

  def heading(node, level)
    text = collapse_inline_whitespace(inline_text(node))
    return nil if text.empty?

    ["", "#{"#" * level} #{text}", ""]
  end

  def paragraph(node)
    if node["class"]&.include?("tape")
      label = node.at(".tape-label")&.text&.strip
      body = node.children.reject { |c| c["class"]&.include?("tape-label") }
      text = body.map { |c| inline_text(c) }.join.strip
      text = "#{label}: #{text}" if label && !label.empty?
      return ["", "    #{text}", ""]
    end

    if node["class"]&.include?("end-strip")
      text = inline_text(node)
      return text.empty? ? nil : ["", text, ""]
    end

    text = collapse_inline_whitespace(inline_text(node))
    return nil if text.empty?

    ["", text, ""]
  end

  def collapse_inline_whitespace(text)
    text
      .gsub(/[ \t\r\f\v\u00A0]+/, " ")
      .split("\n")
      .map(&:strip)
      .reject(&:empty?)
      .join("\n")
      .strip
  end

  def list(node)
    lines = [""]
    ordered = node.name == "ol"
    node.css("> li").each_with_index do |li, index|
      prefix = ordered ? "#{index + 1}. " : "- "
      item = collapse_inline_whitespace(inline_text(li))
      next if item.empty?

      lines << "#{prefix}#{item}"
    end
    lines << ""
    lines.length > 2 ? lines : nil
  end

  def code_block(node)
    code = node.at("code")
    text = (code || node).text
    text = text.delete_suffix("\n")
    return nil if text.strip.empty?

    ["", "```", text, "```", ""]
  end

  def blockquote(node)
    text = inline_text(node)
    return nil if text.empty?

    text.split(/\n+/).map { |line| "> #{line}" }.unshift("").push("")
  end

  def definition_list(node)
    lines = [""]
    node.children.each do |child|
      next unless child.element?

      case child.name
      when "dt"
        lines << "#{inline_text(child)}"
      when "dd"
        lines << "  #{inline_text(child)}"
      end
    end
    lines << ""
    lines.length > 2 ? lines : nil
  end

  def table_as_text(node)
    lines = [""]
    node.css("tr").each do |row|
      cells = row.css("th, td").map { |cell| inline_text(cell) }.reject(&:empty?)
      next if cells.empty?

      lines << cells.join(" — ")
    end
    lines << ""
    lines.length > 2 ? lines : nil
  end

  def inline_text(node)
    return "" unless node

    case node
    when Nokogiri::XML::Text
      decode_entities(node.text)
    when Nokogiri::XML::Element
      return "" if skip_node?(node)

      parts = node.children.map { |child| inline_text(child) }
      glued = glue_inline_parts(parts, node)

      case node.name
      when "code"
        "`#{node.text.gsub('`', "'")}`"
      when "a"
        link_text(node)
      else
        glued
      end
    else
      ""
    end
  end

  def glue_inline_parts(parts, node)
    text = parts.join
    return text if node.name == "code"

    case node.name
    when "br"
      "#{text}\n"
    else
      text
    end
  end

  def link_text(node)
    text = node.children.map { |child| inline_text(child) }.join.strip
    href = node["href"].to_s.strip
    return text if href.empty?

    if href.start_with?("http://", "https://", "mailto:")
      text == href ? href : "#{text} (#{href})"
    else
      text
    end
  end

  def decode_entities(text)
    CGI.unescapeHTML(text).gsub(/[ \t\r\f\v\u00A0]+/, " ")
  end

  def normalize_output(text)
    text
      .gsub(/[ \t]+\n/, "\n")
      .gsub(/\n{3,}/, "\n\n")
      .strip + "\n"
  end
end

def post_html_files
  Dir.glob(File.join(POSTS_DIR, "*.html")).sort
end

def convert_file(html_path, dry_run: false, force: false, stdout: false)
  md_path = html_path.sub(/\.html\z/, ".md")
  markdown = PostMarkdownConverter.new(html_path).to_markdown

  if stdout
    print markdown
    return true
  end

  if !force && File.exist?(md_path) && File.mtime(md_path) >= File.mtime(html_path)
    puts "skip #{File.basename(md_path)} (up to date)"
    return true
  end

  if dry_run
    puts "would write #{md_path} (#{markdown.lines.count} lines)"
    return true
  end

  File.write(md_path, markdown)
  puts "wrote #{md_path}"
  true
rescue StandardError => e
  warn "error #{File.basename(html_path)}: #{e.message}"
  false
end

options = {
  dry_run: false,
  force: false,
  stdout: false,
  file: nil
}

OptionParser.new do |opts|
  opts.banner = "Usage: #{File.basename($PROGRAM_NAME)} [options] [POST.html ...]"

  opts.on("-n", "--dry-run", "Print actions without writing files") { options[:dry_run] = true }
  opts.on("-f", "--force", "Overwrite even when .md is newer than .html") { options[:force] = true }
  opts.on("-o", "--stdout", "Write markdown to stdout (single file only)") { options[:stdout] = true }
  opts.on("-h", "--help", "Show help") do
    puts opts
    exit 0
  end
end.parse!

files = if ARGV.any?
          ARGV.map { |path| File.expand_path(path) }
        elsif options[:file]
          [File.expand_path(options[:file])]
        else
          post_html_files
        end

if options[:stdout] && files.length != 1
  warn "error: --stdout requires exactly one input file"
  exit 1
end

ok = files.all? do |path|
  unless File.file?(path)
    warn "error: not found: #{path}"
    false
  else
    convert_file(path, dry_run: options[:dry_run], force: options[:force], stdout: options[:stdout])
  end
end

exit(ok ? 0 : 1)
