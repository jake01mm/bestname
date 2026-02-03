/**
 * 域名生成器 - 改进版
 * 使用更智能的算法生成高质量域名
 */

// 爆破音辅音（具有强烈发音特征）
const PLOSIVE_CONSONANTS = ['b', 'd', 't', 'k', 'c'];
// 流音和鼻音（增加可读性）
const SMOOTH_CONSONANTS = ['m', 'n', 'r', 's', 'h', 'w', 'j', 'v', 'f'];
// 元音
const VOWELS = ['a', 'e', 'i', 'o', 'u'];

// 常见的音节组合（提高可读性）
const COMMON_SYLLABLES = [
  'na', 'ne', 'ni', 'no', 'nu',
  'ma', 'me', 'mi', 'mo', 'mu',
  'ta', 'te', 'ti', 'to', 'tu',
  'ka', 'ke', 'ki', 'ko', 'ku',
  'ra', 're', 'ri', 'ro', 'ru',
  'sa', 'se', 'si', 'so', 'su'
];

/**
 * 生成域名 - 改进版
 * @param {Object} options 配置选项
 * @returns {string[]} 生成的域名列表
 */
export function generateDomains(options = {}) {
  const {
    startsWith = 'n',
    excludeLetters = ['l', 'z', 'x', 'y', 'g', 'p', 'q'],
    minLength = 2,
    maxLength = 15,
    fixedLength = null,
    count = 50
  } = options;

  const domains = new Set();
  const excludeSet = new Set(excludeLetters.map(l => l.toLowerCase()));
  
  // 过滤可用字母
  const availableConsonants = [...PLOSIVE_CONSONANTS, ...SMOOTH_CONSONANTS]
    .filter(c => !excludeSet.has(c));
  const availableVowels = VOWELS.filter(v => !excludeSet.has(v));
  
  // 过滤可用音节
  const availableSyllables = COMMON_SYLLABLES.filter(s => 
    s.startsWith(startsWith.toLowerCase()) && 
    ![...s].some(c => excludeSet.has(c))
  );
  
  console.log(`[生成器] 开始生成域名，目标数量: ${count}`);
  console.log(`[生成器] 规则: 以"${startsWith}"开头, 排除字母: ${excludeLetters.join(',')}`);
  console.log(`[生成器] 可用音节: ${availableSyllables.length}个`);
  
  let attempts = 0;
  const maxAttempts = count * 20; // 增加尝试次数
  
  while (domains.size < count && attempts < maxAttempts) {
    attempts++;
    const length = fixedLength || (minLength + Math.floor(Math.random() * (maxLength - minLength + 1)));
    
    // 70%概率使用音节组合，30%使用字母组合
    const useSyllables = Math.random() < 0.7 && availableSyllables.length > 0;
    
    const domain = useSyllables 
      ? generateSyllableDomain(startsWith, length, availableSyllables, excludeSet)
      : generateLetterDomain(startsWith, length, availableConsonants, availableVowels, excludeSet);
    
    if (domain && domain.length >= minLength && domain.length <= maxLength) {
      // 质量检查：避免重复字母过多
      if (isGoodQuality(domain)) {
        domains.add(domain);
      }
    }
  }
  
  console.log(`[生成器] 完成生成，共生成 ${domains.size} 个域名，尝试次数: ${attempts}`);
  return Array.from(domains);
}

/**
 * 使用音节生成域名（更自然）
 */
function generateSyllableDomain(startsWith, targetLength, syllables, excludeSet) {
  let domain = '';
  
  // 选择以startsWith开头的音节
  const startSyllables = syllables.filter(s => s.startsWith(startsWith.toLowerCase()));
  if (startSyllables.length === 0) return null;
  
  domain = startSyllables[Math.floor(Math.random() * startSyllables.length)];
  
  // 继续添加音节直到达到目标长度
  while (domain.length < targetLength) {
    const remainingLength = targetLength - domain.length;
    
    // 选择合适长度的音节
    const suitableSyllables = syllables.filter(s => s.length <= remainingLength);
    if (suitableSyllables.length === 0) break;
    
    const nextSyllable = suitableSyllables[Math.floor(Math.random() * suitableSyllables.length)];
    domain += nextSyllable;
  }
  
  return domain.slice(0, targetLength);
}

/**
 * 使用字母生成域名（辅音-元音交替）
 */
function generateLetterDomain(startsWith, length, consonants, vowels, excludeSet) {
  let domain = startsWith.toLowerCase();
  let lastWasVowel = VOWELS.includes(startsWith.toLowerCase());
  
  while (domain.length < length) {
    if (lastWasVowel) {
      const char = consonants[Math.floor(Math.random() * consonants.length)];
      if (!excludeSet.has(char)) {
        domain += char;
        lastWasVowel = false;
      }
    } else {
      const char = vowels[Math.floor(Math.random() * vowels.length)];
      if (!excludeSet.has(char)) {
        domain += char;
        lastWasVowel = true;
      }
    }
  }
  
  return domain;
}

/**
 * 检查域名质量
 */
function isGoodQuality(domain) {
  // 避免连续3个相同字母
  if (/(.)\1{2,}/.test(domain)) return false;
  
  // 避免过多重复字母
  const uniqueChars = new Set(domain).size;
  if (uniqueChars < domain.length * 0.5) return false;
  
  return true;
}

/**
 * 检查域名是否包含排除的字母
 */
export function validateDomain(domain, excludeLetters) {
  const excludeSet = new Set(excludeLetters.map(l => l.toLowerCase()));
  return ![...domain.toLowerCase()].some(char => excludeSet.has(char));
}
