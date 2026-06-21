// 防抖
// function debounce (fn, delay){
//     let timeout;
//     return function(...args) {
//         clearTimeout(timeout);
//         timeout = setTimeout(()=>{
//             fn.apply(this, ...args);
//         }, delay);
//     }
// }
//
// // 节流
// function throttle (fn, delay){
//     let timer;
//     return function(...args) {
//         if (timer) return
//         timer = setTimeout(()=>{
//             fn.apply(this, ...args)
//             timer=null
//         },delay)
//
//     }
// }

// Promise.myAll = function(promises) {
//     return new Promise((resolve,reject) => {
//         const result = []
//         let count = 0
//
//         if(promises.length < 0){
//             return resolve([])
//         }
//
//         promises.forEach((p,index) => {
//             Promise.resolve(p).then(res=>{
//                 result[index] = res
//                 count++
//                 if (count === promises.length) {
//                     resolve(result)
//                 }
//             }).catch(reject)
//         })
//     })
//
// }

function debounce(fn, delay) {
  let timeout;
  // 这里的 ...args 是啥？
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      // 还有这里为什么要用apply
      fn.apply(this, ...args);
    }, delay);
  };
}
function throttle(fn, delay) {
  let timer;
  return function (...args) {
    // 为什么要 return
    if (timer) return;
    timer = setTimeout(() => {
      fn.apply(this, ...args);
      timer = null;
    }, delay);
  };
}

Promise.myAll = function (promises) {
  return new Promise((resolve, reject) => {
    const result = [];
    let count = 0;

    if (promises.length < 0) {
      return resolve([]);
    }

    promises.forEach((p, idx) => {
      Promise.resolve(p)
        .then((res) => {
          result[idx] = res;
          count++;
          if (count === promises.length) {
            resolve(result);
          }
        })
        .catch(reject);
    });
  });
};

function flatten(arr) {
  // 实现 [1, [2, [3, 4]], 5] => [1, 2, 3, 4, 5]
  const result = [];

  arr.forEach((item) => {
    if (Array.isArray(item)) {
      result.push(...flatten(item));
    } else {
      result.push(item);
    }
  });
}

function once(fn) {
  // 保证 fn 只执行一次
  let called = false;
  let result;

  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}

function unique(arr) {
  // 实现 [1, 2, 2, 3, 3, 4] => [1, 2, 3, 4]
  const result = [];

  arr.forEach((item) => {
    if (!result.includes(item)) {
      result.push(item);
    }
  });
}
