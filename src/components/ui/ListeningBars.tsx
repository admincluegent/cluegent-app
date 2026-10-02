import React from 'react';
import './ListeningBars.css';

/** Listening animation, not a measured audio-level meter. */
const ListeningBars = React.memo(({ active }: { active: boolean }) => (
    <span aria-label={active ? 'Listening active' : 'Audio paused'} role="img" className="listening-bars" data-active={active}>
        {[0, 1, 2, 3, 4].map(index => <span key={index} style={{ animationDelay: `${index * -0.17}s` }} />)}
    </span>
));
export default ListeningBars;
