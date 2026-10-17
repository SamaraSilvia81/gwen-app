import { useRef, useState } from 'react';
import { Camera, Trash } from '@phosphor-icons/react';
import { fileToAvatar } from '../lib/avatar';
import { Label } from './Modal';

/** Foto do perfil, ou a inicial do nome quando não há foto. */
export default function Avatar({ profile, size = 24, className = '' }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.45) };
  if (profile?.avatar) {
    return <img src={profile.avatar} alt="" style={style} className={`rounded-full object-cover shrink-0 ${className}`} draggable="false" />;
  }
  return (
    <span
      style={style}
      className={`rounded-full shrink-0 bg-[var(--c-phosphor-20)] text-phosphor grid place-items-center font-bold font-display ${className}`}
    >
      {(profile?.display_name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Escolher, trocar ou remover a foto. `onChange` recebe o data URL ou null. */
export function AvatarPicker({ avatar, name, onChange, size = 56, disabled }) {
  const input = useRef(null);
  const [error, setError] = useState('');

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      onChange(await fileToAvatar(file));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar profile={{ display_name: name, avatar }} size={size} />
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => input.current?.click()} disabled={disabled}>
            <Camera size={16} />
            <Label>{avatar ? 'Trocar foto' : 'Escolher foto'}</Label>
          </button>
          {avatar && (
            <button type="button" className="btn btn-ghost" onClick={() => onChange(null)} disabled={disabled}>
              <Trash size={16} />
              <Label>Remover</Label>
            </button>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
      {error && <p className="mt-2 text-[13px] text-ember">{error}</p>}
    </div>
  );
}
