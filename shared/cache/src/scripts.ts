// All checks and writes in each script execute atomically on standalone Redis.
export const READ = `
local generation = redis.call('GET', KEYS[2]) or '0'
local value = redis.call('GET', KEYS[1])
if value then
  local envelope = cjson.decode(value)
  if envelope.generation == generation then return {generation, envelope.payload} end
end
return {generation, false}`;

export const PUBLISH = `
if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
if (redis.call('GET', KEYS[3]) or '0') ~= ARGV[2] then return 0 end
redis.call('SET', KEYS[1], ARGV[3], 'PX', ARGV[4])
return 1`;

export const RELEASE = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0`;

export const RENEW = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
return 0`;

export const INVALIDATE = `
redis.call('INCR', KEYS[1])
for i = 2, #KEYS do redis.call('DEL', KEYS[i]) end
return 1`;
