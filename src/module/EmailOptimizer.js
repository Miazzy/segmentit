// @flow
import { Optimizer } from './BaseModule';
import type { SegmentToken } from './type';

// 邮箱地址中允许出现的字符
// 参考：http://www.cs.tut.fi/~jkorpela/rfc/822addr.html
const _EMAILCHAR = '!"#$%&\'*+-/0123456789=?@ABCDEFGHIJKLMNOPQRSTUVWXYZ^_`abcdefghijklmnopqrstuvwxyz{|}~.'.split('');
const EMAILCHAR = {};
for (const i in _EMAILCHAR) EMAILCHAR[_EMAILCHAR[i]] = 1;

export default class EmailOptimizer extends Optimizer {
  doOptimize(words: Array<SegmentToken>): Array<SegmentToken> {
    const POSTAG = this.segment.POSTAG;
    // debug(words);

    let i = 0;
    let ie = words.length - 1;
    let addr_start = false;
    let has_at = false;
    while (i < ie) {
      var word = words[i];
      var is_ascii = !!(word.p === POSTAG.A_NX || (word.p === POSTAG.A_M && word.w.charCodeAt(0) < 128));

      // 如果是外文字符或者数字，符合电子邮件地址开头的条件
      if (addr_start === false && is_ascii) {
        addr_start = i;
        i++;
        continue;
      } else {
        // 如果遇到@符号，符合第二个条件
        if (has_at === false && word.w === '@') {
          has_at = true;
          i++;
          continue;
        }
        // 如果已经遇到过@符号，且出现了其他字符，则截取邮箱地址
        if (has_at !== false && words[i - 1].w != '@' && is_ascii === false && !(word.w in EMAILCHAR)) {
          var mailws = words.slice(addr_start, i);
          words.splice(addr_start, mailws.length, {
            w: EmailOptimizer.toEmailAddress(mailws),
            p: POSTAG.URL,
          });
          i = addr_start + 1;
          ie -= mailws.length - 1;
          addr_start = false;
          has_at = false;
          continue;
        }
        // 如果已经开头
        if (addr_start !== false && (is_ascii || word.w in EMAILCHAR)) {
          i++;
          continue;
        }
      }

      // 移到下一个词
      addr_start = false;
      has_at = false;
      i++;
    }

    // 检查剩余部分
    if (addr_start && has_at && words[ie]) {
      var word = words[ie];
      var is_ascii = !!(word.p === POSTAG.A_NX || (word.p === POSTAG.A_M && word.w in EMAILCHAR));
      if (is_ascii) {
        var mailws = words.slice(addr_start, words.length);
        words.splice(addr_start, mailws.length, {
          w: EmailOptimizer.toEmailAddress(mailws),
          p: POSTAG.URL,
        });
      }
    }

    return words;
  }

  /**
 * 根据一组单词生成邮箱地址
 *
 * @param {array} words 单词数组
 * @return {string}
 */
  static toEmailAddress(words: Array<SegmentToken>): string {
    let ret = words[0].w;
    for (var i = 1, word; (word = words[i]); i++) {
      ret += word.w;
    }
    return ret;
  }
}
