<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:atom="http://www.w3.org/2005/Atom"
                xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
                version="3.0">

<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat"/>

<xsl:template match="/">
<html lang="en">
<head>
<title>
<xsl:value-of select="/rss/channel/title"/> - RSS Feed
</title>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<style type="text/css">
:root {
--primary-red: #E63946;
--primary-black: #000000;
--primary-yellow: #F4A261;
--primary-white: #FFFFFF;
--bg-gray: #F1F1F1;
--text-gray: #666;
}

* {
box-sizing: border-box;
}

body {
background-color: var(--bg-gray);
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
color: var(--primary-black);
margin: 0;
padding: 0;
overflow-x: hidden;
line-height: 1.6;
}

/* Typography utilities */
.font-display {
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
font-weight: 900;
text-transform: uppercase;
letter-spacing: 0.05em;
}

.text-red { color: var(--primary-red); }
.bg-red { background-color: var(--primary-red); }
.bg-black { background-color: black; }
.text-white { color: white; }
.bg-white { background-color: white; }

/* Container */
.container {
max-width: 1200px;
margin: 0 auto;
padding: 2rem 1.5rem;
position: relative;
}

/* Background decorations */
.bg-halftone {
background-image: radial-gradient(#333 12%, transparent 12%),
                  radial-gradient(#333 12%, transparent 12%);
background-size: 15px 15px;
background-position: 0 0, 7.5px 7.5px;
opacity: 0.08;
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
z-index: -1;
pointer-events: none;
}

.bg-shape-red {
position: fixed;
top: -15%;
left: -8%;
width: 70%;
height: 120%;
background: linear-gradient(135deg, var(--primary-red) 0%, #D62828 100%);
transform: skewX(-15deg);
opacity: 0.92;
border-right: 15px solid black;
z-index: -1;
pointer-events: none;
box-shadow: 20px 0 40px rgba(0,0,0,0.2);
}

.bg-shape-yellow {
position: fixed;
bottom: -8%;
right: -15%;
width: 55%;
height: 70%;
background: linear-gradient(135deg, var(--primary-yellow) 0%, #E76F51 100%);
transform: skewX(-15deg);
border-left: 12px solid black;
z-index: -1;
pointer-events: none;
opacity: 0.85;
}

/* Header */
header {
position: relative;
margin-bottom: 3rem;
padding-top: 1rem;
}

.rss-badge {
position: absolute;
top: -0.5rem;
left: -1rem;
background: black;
color: white;
padding: 1rem 1.5rem;
transform: rotate(-8deg);
box-shadow: 10px 10px 0px 0px var(--primary-red);
z-index: 10;
border: 3px solid white;
}

.rss-badge .title {
font-size: 2.5rem;
line-height: 1;
margin: 0;
}

.rss-badge .subtitle {
font-size: 1.2rem;
color: var(--primary-yellow);
margin: 0;
}

.title-box {
display: inline-block;
background: black;
color: white;
padding: 0.75rem 2.5rem;
transform: skewX(-12deg);
border: 5px solid white;
box-shadow: 12px 12px 0px 0px var(--primary-red);
font-size: clamp(1.8rem, 5vw, 3.5rem);
margin-top: 4rem;
margin-left: auto;
}

.description-box {
background: white;
padding: 0.5rem 1.5rem;
margin-top: 1rem;
transform: skewX(-12deg);
border: 3px solid black;
display: inline-block;
float: right;
clear: both;
max-width: 600px;
}

/* Grid Layout */
.grid-layout {
display: grid;
grid-template-columns: 1fr;
gap: 2.5rem;
}

@media (min-width: 768px) {
.grid-layout {
grid-template-columns: 1fr 2fr;
}
}

/* Sidebar */
.info-card {
background: black;
color: white;
padding: 2rem;
transform: skewX(-5deg);
border-left: 10px solid var(--primary-red);
position: relative;
margin-bottom: 2rem;
box-shadow: 8px 8px 0 rgba(0,0,0,0.3);
}

.info-badge {
position: absolute;
right: -1rem;
top: -1rem;
width: 4.5rem;
height: 4.5rem;
background: var(--primary-yellow);
border: 5px solid black;
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
color: black;
font-weight: 900;
font-size: 1.5rem;
box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}

.info-card h3 {
font-size: 2rem;
color: var(--primary-red);
margin: 0 0 1rem 0;
}

.info-list {
list-style: none;
padding: 0;
margin: 0;
font-weight: bold;
font-size: 1.1rem;
}

.info-list li {
display: flex;
justify-content: space-between;
border-bottom: 2px solid #444;
padding-bottom: 0.5rem;
margin-bottom: 0.75rem;
}

.info-list .value {
color: var(--primary-yellow);
}

.nav-link {
display: block;
background: white;
border: 5px solid black;
padding: 1rem 2rem;
font-weight: 900;
font-size: 1.5rem;
text-transform: uppercase;
letter-spacing: 0.05em;
transform: skewX(-12deg);
margin-bottom: 1.5rem;
text-decoration: none;
color: black;
transition: all 0.2s ease;
box-shadow: 6px 6px 0 0 black;
text-align: center;
}

.nav-link:hover {
background: var(--primary-red);
color: white;
transform: skewX(-12deg) translateX(8px);
box-shadow: 10px 10px 0 0 black;
}

/* Feed Section */
.section-title {
background: black;
color: white;
padding: 0.5rem 1.5rem;
display: inline-block;
transform: skewX(-12deg);
margin-bottom: 2rem;
border: 3px solid var(--primary-yellow);
}

.section-title h2 {
font-size: 1.8rem;
margin: 0;
}

/* Feed Items */
.feed-item {
position: relative;
margin-bottom: 2.5rem;
cursor: pointer;
transition: transform 0.2s ease;
}

.feed-item:hover {
transform: translateY(-4px);
}

.feed-bg {
position: absolute;
inset: 0;
background: white;
border: 4px solid black;
box-shadow: 8px 8px 0 0 rgba(0,0,0,0.2);
transform: skewX(-8deg);
z-index: 0;
transition: all 0.3s ease;
}

.feed-item:hover .feed-bg {
background: black;
box-shadow: 12px 12px 0 0 var(--primary-red);
transform: skewX(-8deg) translate(6px, -3px);
}

.feed-content {
position: relative;
z-index: 10;
padding: 1.5rem;
display: flex;
gap: 1.5rem;
}

.date-box {
flex-shrink: 0;
padding-right: 1.5rem;
border-right: 3px dashed #ddd;
text-align: center;
display: flex;
flex-direction: column;
justify-content: center;
min-width: 80px;
}

.feed-item:hover .date-box {
border-color: #666;
}

.date-day {
font-size: 2.5rem;
font-weight: 900;
color: #ccc;
line-height: 1;
}

.date-month {
font-size: 1rem;
color: #999;
text-transform: uppercase;
font-weight: 700;
margin-top: 0.25rem;
}

.feed-item:hover .date-day {
color: var(--primary-red);
}

.feed-item:hover .date-month {
color: white;
}

.text-content {
flex: 1;
}

.text-content h3 {
margin: 0 0 0.5rem 0;
font-size: 1.4rem;
line-height: 1.3;
color: black;
font-weight: 700;
}

.feed-item:hover .text-content h3 {
color: white;
}

.text-content .author {
font-size: 0.85rem;
color: var(--primary-red);
font-weight: 600;
margin-bottom: 0.5rem;
}

.feed-item:hover .text-content .author {
color: var(--primary-yellow);
}

.text-content p {
margin: 0;
color: var(--text-gray);
font-size: 0.95rem;
display: -webkit-box;
-webkit-line-clamp: 3;
-webkit-box-orient: vertical;
overflow: hidden;
}

.feed-item:hover .text-content p {
color: #ddd;
}

/* Footer */
footer {
margin-top: 4rem;
padding-top: 2rem;
border-top: 10px solid black;
position: relative;
text-align: center;
}

.footer-tag {
position: absolute;
top: -1.5rem;
right: 3rem;
background: var(--primary-red);
color: white;
padding: 0.5rem 1.5rem;
font-weight: 900;
text-transform: uppercase;
transform: rotate(5deg);
border: 3px solid black;
box-shadow: 4px 4px 0 rgba(0,0,0,0.3);
}

.footer-watermark {
font-size: 3rem;
opacity: 0.15;
user-select: none;
margin: 1rem 0;
font-weight: 900;
}

.footer-credit {
font-weight: 600;
margin-top: 1rem;
color: var(--text-gray);
}

/* Decorative elements */
.deco-star {
position: fixed;
bottom: 3rem;
left: 3rem;
width: 80px;
height: 80px;
background: black;
clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
opacity: 0.6;
pointer-events: none;
z-index: 5;
}

/* Responsive adjustments */
@media (max-width: 768px) {
.bg-shape-red {
width: 90%;
}
.bg-shape-yellow {
width: 80%;
}
.feed-content {
flex-direction: column;
}
.date-box {
border-right: none;
border-bottom: 3px dashed #ddd;
padding-bottom: 1rem;
padding-right: 0;
flex-direction: row;
gap: 1rem;
min-width: auto;
}
.rss-badge {
position: static;
transform: rotate(0deg);
margin-bottom: 2rem;
}
.title-box {
margin-top: 1rem;
}
}

/* What is RSS info box */
.rss-info {
background: linear-gradient(135deg, #fff 0%, #f8f8f8 100%);
border: 4px solid black;
padding: 1.5rem;
margin-bottom: 2rem;
border-left: 10px solid var(--primary-yellow);
}

.rss-info h4 {
margin: 0 0 0.5rem 0;
font-size: 1.2rem;
color: var(--primary-red);
}

.rss-info p {
margin: 0;
font-size: 0.9rem;
color: #444;
}
</style>
</head>

<body>
<div class="bg-halftone"/>
<div class="bg-shape-red"/>
<div class="bg-shape-yellow"/>

<div class="container">
<header>
<div class="rss-badge">
<div class="font-display title">RSS</div>
<div class="font-display subtitle">FEED</div>
</div>
<div style="text-align: right;">
<div class="title-box">
<span class="font-display">
<xsl:value-of select="/rss/channel/title"/>
</span>
</div>
<div class="description-box">
<p class="font-display" style="letter-spacing: 0.05em; margin: 0; font-size: 0.9rem;">
<xsl:value-of select="/rss/channel/description"/>
</p>
</div>
</div>
</header>

<div class="rss-info">
<h4>📡 What is RSS?</h4>
<p>RSS (Really Simple Syndication) allows you to subscribe to this content and receive updates in your favorite RSS reader app. Never miss an episode!</p>
</div>

<div class="grid-layout">
<!-- Sidebar -->
<div>
<div class="info-card">
<div class="info-badge">📊</div>
<h3 class="font-display">INFO</h3>
<ul class="info-list">
<li>
<span>LANGUAGE</span>
<span class="value">
<xsl:value-of select="/rss/channel/language"/>
</span>
</li>
<li>
<span>EPISODES</span>
<span class="value">
<xsl:value-of select="count(/rss/channel/item)"/>
</span>
</li>
<li>
<span>UPDATED</span>
<span class="value">
<xsl:value-of select="substring(/rss/channel/lastBuildDate, 6, 11)"/>
</span>
</li>
</ul>
</div>
<nav>
<a href="{/rss/channel/link}" class="nav-link font-display">
🌐 Visit Site
</a>
</nav>
</div>

<!-- Feed Items -->
<div>
<div class="section-title">
<h2 class="font-display">Latest Episodes</h2>
</div>
<div>
<xsl:for-each select="/rss/channel/item">
<div class="feed-item" onclick="window.open('{link}', '_blank')">
<div class="feed-bg"/>
<div class="feed-content">
<div class="date-box">
<span class="date-day">
<xsl:value-of select="substring(pubDate, 6, 2)"/>
</span>
<span class="date-month">
<xsl:value-of select="substring(pubDate, 9, 3)"/>
</span>
</div>
<div class="text-content">
<div class="author">
<xsl:value-of select="itunes:author"/>
</div>
<h3>
<xsl:value-of select="title"/>
</h3>
<p>
<xsl:value-of select="substring(description, 1, 200)"/>
<xsl:if test="string-length(description) &gt; 200">...</xsl:if>
</p>
</div>
</div>
</div>
</xsl:for-each>
</div>
</div>
</div>

<footer>
<div class="footer-tag font-display">STAY UPDATED</div>
<div class="footer-watermark font-display">
PODCAST FEED
</div>
<p class="footer-credit">
Styled RSS Feed • Subscribe in your favorite RSS reader
</p>
</footer>
</div>

<div class="deco-star"/>
</body>
</html>
</xsl:template>

</xsl:stylesheet>
