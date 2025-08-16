def longest_palindrome(s):
    """
    Find the longest palindromic substring using expand around centers approach.
    Time complexity: O(n^2), Space complexity: O(1)
    """
    if not s:
        return ""
    
    start = 0
    max_len = 1
    
    def expand_around_center(left, right):
        """Expand around center and return length of palindrome"""
        while left >= 0 and right < len(s) and s[left] == s[right]:
            left -= 1
            right += 1
        return right - left - 1
    
    for i in range(len(s)):
        # Check for odd length palindromes (center at i)
        len1 = expand_around_center(i, i)
        # Check for even length palindromes (center between i and i+1)
        len2 = expand_around_center(i, i + 1)
        
        current_max = max(len1, len2)
        if current_max > max_len:
            max_len = current_max
            # Calculate start position
            start = i - (current_max - 1) // 2
    
    return s[start:start + max_len]

# Test cases
if __name__ == "__main__":
    test_cases = [
        "babad",
        "cbbd", 
        "a",
        "ac",
        "racecar",
        "abcdef"
    ]
    
    for test in test_cases:
        result = longest_palindrome(test)
        print(f"Input: '{test}' -> Output: '{result}'")