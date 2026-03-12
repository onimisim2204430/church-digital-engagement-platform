"""
Content utility functions
"""
import re
from html.parser import HTMLParser


class HTMLStripper(HTMLParser):
    """Strip HTML tags from text"""
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs = True
        self.text = []

    def handle_data(self, d):
        self.text.append(d)

    def get_data(self):
        return ''.join(self.text)


def strip_html(html_text):
    """
    Remove HTML tags from text
    """
    if not html_text:
        return ''
    
    stripper = HTMLStripper()
    stripper.feed(html_text)
    return stripper.get_data()


def generate_excerpt(content, max_length=220):
    """
    Generate excerpt from content
    
    Rules:
    - Strip HTML tags
    - Limit to max_length characters
    - Preserve sentence integrity (don't cut mid-sentence)
    - Add ellipsis if truncated
    
    Args:
        content: HTML or plain text content
        max_length: Maximum character count (default 220)
    
    Returns:
        Clean excerpt string
    """
    if not content:
        return ''
    
    # Strip HTML
    clean_text = strip_html(content)
    
    # Remove extra whitespace
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    
    # If already short enough, return as is
    if len(clean_text) <= max_length:
        return clean_text
    
    # Find the last sentence boundary before max_length
    truncated = clean_text[:max_length]
    
    # Look for sentence endings: . ! ?
    sentence_ends = [
        truncated.rfind('. '),
        truncated.rfind('! '),
        truncated.rfind('? ')
    ]
    
    last_sentence = max(sentence_ends)
    
    if last_sentence > max_length * 0.6:  # At least 60% of max_length
        # Cut at sentence boundary
        excerpt = clean_text[:last_sentence + 1].strip()
    else:
        # Cut at last space to avoid mid-word break
        last_space = truncated.rfind(' ')
        if last_space > 0:
            excerpt = clean_text[:last_space].strip() + '...'
        else:
            excerpt = truncated + '...'
    
    return excerpt
