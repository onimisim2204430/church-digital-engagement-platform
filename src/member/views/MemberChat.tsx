/**
 * Member Community — Sanctuary Mock
 * Static UI conversion from provided reference HTML.
 */

import React from 'react';
import {
  BookOpen,
  Church,
  Info,
  Menu,
  MessageSquarePlus,
  Phone,
  Plus,
  Search,
  Send,
  Smile,
  Users,
  Video,
} from 'lucide-react';
import './MemberChat.css';

const MemberChat: React.FC = () => {
  return (
    <div className="mc-page">
      <div className="mc-grid">
        <section className="mc-left-col">
          <div className="mc-featured-channel" role="button" tabIndex={0}>
            <div className="mc-featured-bg-icon" aria-hidden="true">
              <Church size={92} strokeWidth={1.7} />
            </div>
            <div className="mc-featured-inner">
              <div className="mc-featured-top">
                <span className="mc-featured-pill">Active Channel</span>
                <div className="mc-featured-avatars" aria-hidden="true">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzx4NRL_HXjhrar8Z70qZKnSNdqHaA9nATBZRzJgJ3EerhWEQxuG1HraIBrPFJmGefoH4ObWI0jNIEbHj6aD-2vQ6Jf607MMIv-kvDmTjd_heJl7cpqbebn9GHqnO1mcQQEjVbFK2fl3J9kni4oF0UduVR3gKrq1lAexwtkxYBeS3rafmt2LghO_Cxts0HQ0oVIBVhDxtfYshlwlTLzWN5ws4e4u3TklqIY3MxfhZhcMYih9qWpaH_w1qVRCx1XsFjyY3qiC3btl4" alt="Profile of a young woman with a warm smile" />
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQ-GO8gShZmCZJV-JYH_WiIqRHbYVc1QswIlfTGr93oO58tf7j80Oq2OZlYMwmrwpLecIRw7yBbk2ULGdaBpBeIj2q5v-CPIEZj7KW5TcX0b77Uw9WFEHtvCGK4mB_27jhNw7qeFoTYb8WxW_xSjnjbRwYl9a9mTWWb1ah4eTybYFMsJxQZ3EO8hIOhp-6Z7MTwrYq-AMCw9oHe5bhcSL40rPxbQ0Oa4VUw8FsjblbPjbNGqKYwSGQHlSE7rQP8k4HzxQpEb1aIjY" alt="Headshot of a professional man in spectacles" />
                  <span className="mc-featured-more">+42</span>
                </div>
              </div>
              <h2 className="mc-featured-title">Global Prayer Room</h2>
              <p className="mc-featured-quote">"Joining you all in prayer for the upcoming mission trip..."</p>
            </div>
          </div>

          <div className="mc-search">
            <Search size={17} strokeWidth={2.2} aria-hidden="true" />
            <input type="text" placeholder="Search chats or members..." />
          </div>

          <div className="mc-chat-list">
            <article className="mc-chat-item mc-chat-item-unread">
              <div className="mc-chat-avatar-wrap">
                <img className="mc-chat-avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUDu6BQ0v1MQUxwWJK6WFvArvyidSkZp8hu1duovAbnrx0bXy_cDGOgge_LXloKz0a8Mh-qN1IZ1h80nAFfI7YjF21PK_UhS8hRN8M0LznuOfZ1dQhqZ3mGbSU8gSSSOtbbAfsWDWlpkMgbYxe7iYm5Rn7efcb7SqU053TzyM-pqSvq_euqU6QBhhRTw1pbza4NkGNWOdFlZwqeNbope5IC4TOgVw1Sm7btRbSUr7BH0bsyztSj9DX5mMaUa6DIe8MiDWW8KCEai8" alt="Sarah Miller" />
                <span className="mc-presence-dot" />
              </div>
              <div className="mc-chat-body">
                <div className="mc-chat-top">
                  <h3>Sarah Miller</h3>
                  <span>2m ago</span>
                </div>
                <p className="mc-chat-preview mc-chat-preview-strong">Could you share the verse from this morning's sermon?</p>
              </div>
              <span className="mc-unread-count">1</span>
            </article>

            <article className="mc-chat-item">
              <div className="mc-chat-icon-box"><Users size={20} strokeWidth={2.2} /></div>
              <div className="mc-chat-body">
                <div className="mc-chat-top">
                  <h3>Youth Leaders Group</h3>
                  <span>1h ago</span>
                </div>
                <p className="mc-chat-preview"><strong>Pastor John:</strong> Don't forget the retreat planning meeting tonight.</p>
              </div>
            </article>

            <article className="mc-chat-item">
              <div className="mc-chat-avatar-wrap">
                <img className="mc-chat-avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9B6RzKwUmH-pxbT8TJZFNboCcrYrq-zpT62xeC85EoMYs8ArbXjSr8FZcbLbNDpfZa4yjQsD98KognGCwvfrwH8rL8cNz5W9TA3BZxPg8Va7QhqJBipQBlS9Ct_V3L1IMH88WupYWhGSAuVtzKt8iyGjaVxc6ING6FK0fToIirFZfeoum_RWq3Q4BuMr8nD6bFm6_lsoDfRUrdOhBGBuv-9K41MpZFHZtSQkK-t7r6vaKGFca6uy3a9y1n_pKSpZsXW_UWm3TI1A" alt="David Chen" />
              </div>
              <div className="mc-chat-body">
                <div className="mc-chat-top">
                  <h3>David Chen</h3>
                  <span>Yesterday</span>
                </div>
                <p className="mc-chat-preview">Thanks for the help with the setup!</p>
              </div>
            </article>

            <article className="mc-chat-item">
              <div className="mc-chat-icon-box"><BookOpen size={20} strokeWidth={2.2} /></div>
              <div className="mc-chat-body">
                <div className="mc-chat-top">
                  <h3>Monday Night Bible Study</h3>
                  <span>2d ago</span>
                </div>
                <p className="mc-chat-preview"><strong>Mary:</strong> I've uploaded the study guide to the portal.</p>
              </div>
            </article>
          </div>

          <button className="mc-new-chat-btn" type="button">
            <MessageSquarePlus size={16} strokeWidth={2.2} aria-hidden="true" />
            Start New Conversation
          </button>
        </section>

        <section className="mc-right-col" aria-label="Active chat preview">
          <div className="mc-preview-head">
            <div className="mc-preview-user">
              <div className="mc-chat-avatar-wrap">
                <img className="mc-chat-avatar mc-chat-avatar-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDOFRFPPYiY-O17NMw2n2Ne0ihv4zgkJ3PduPHmSWIzeRUOWHORSBu0oEx-obdkf_pqNswO3Wv1XisT670tFVEckiLJTYx-Gf4wRrmU8x9CU-m30vq-5ukqANJjNZy4Te_NTh9yByq1-xFE0RL5oD27exWHQq48kz3QgH-EwYPbsjCIgJV7ovM2sCTOICkuHzT2Sn24TtweczGcvrHfHZPuFsoxsWtbnIy5u8lJWaEo4UbCK9T7QklQoJ6XfEqmaxJYT_us3zP3it0" alt="Sarah Miller" />
                <span className="mc-presence-dot mc-presence-dot-small" />
              </div>
              <div>
                <h2>Sarah Miller</h2>
                <p>Typing...</p>
              </div>
            </div>
            <div className="mc-preview-actions">
              <button type="button" aria-label="Call"><Phone size={18} /></button>
              <button type="button" aria-label="Video call"><Video size={18} /></button>
              <button type="button" aria-label="Chat info"><Info size={18} /></button>
            </div>
          </div>

          <div className="mc-messages">
            <div className="mc-day-chip">Today</div>

            <div className="mc-msg-row mc-msg-row-in">
              <img className="mc-msg-avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGaQJd_cNBxk6XlCWcdApTrMwv0ftR8ahxkIatNKp9sb1zDym3i2lX7_3MJNSManeafYhsc8NQEUbCs3nSKRij-HAgnM2nYQA6thaD71Lk6IMiV57bVmpZfMCtmNudMCDflZR0zsIbm25U4DXYHz8M4iA9VEAUFrmxSPjExttQ84pYlOWeRO4935oXdCX1zaAU_QNV_58__AsoVVp9IjEPUj03aUDG-9Wy9R3mWlzoLv69yn7aYVT23TvKPHve2FA93wL51gRJHF0" alt="User avatar small" />
              <div>
                <div className="mc-bubble mc-bubble-in">
                  Good morning! I was just reflecting on today's scripture during my commute. Hope you're having a blessed start to your week.
                </div>
                <span className="mc-msg-time">09:12 AM</span>
              </div>
            </div>

            <div className="mc-msg-row mc-msg-row-out">
              <div>
                <div className="mc-bubble mc-bubble-out">
                  Morning Sarah! It was truly powerful. I'm actually writing down some thoughts on it right now for the community blog.
                </div>
                <span className="mc-msg-time">09:15 AM</span>
              </div>
            </div>

            <div className="mc-msg-row mc-msg-row-in">
              <img className="mc-msg-avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEmC6rOzjvi8YLp3-Gt6SAJQVbWx72KaT3VxyoVkFV_EpVZjTSY-mpwyfBbPkR0d3PSGIeXs_nBwx9dRIZTir_M-j7tuReIL8Rr94eQaJnMV7q_Z7sTnaghfRTg8GD0hCOD5NvRIV3e5PPEQfVAZ2jhOvDagykI9XEs2pK6dv-Gg5oGrViBxrLLjDdvFV3qRDd_XSzELubFFM7PCNIldP6SuveC7MIr93BL8t_vZQC_JPlFUsOlGZVh-1tdIvjhN8ziOqv1eJUvcg" alt="User avatar small" />
              <div>
                <div className="mc-bubble mc-bubble-in mc-bubble-in-accent">
                  That's wonderful! Could you share the verse from this morning's sermon? I missed the exact citation.
                </div>
                <span className="mc-msg-time">09:41 AM</span>
              </div>
            </div>

            <div className="mc-typing-row" aria-hidden="true">
              <img className="mc-msg-avatar mc-msg-avatar-typing" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMKLa3fyMgrRIzNMBC8D3CScbCTESYANWlu3rldxCdo0Ly0QnzWbb3v5Yami6FVe6u7u3959ye2TMb8VkGd89Q4seBAYYD1k7sm2RRvQhNtnREXXRjnAxVCh5MXAb3lcO5pETLdLQ3oga3GskBh8yjpAMZM6j0GTLkUBCVJggUDHRnagSilHvGGKp0l3aGQmShkrLYIuXIijY_STk_2ONPogh0QDPchoPjgSKfZ7pBGJ4No699krZlSlCVMKtYe2pJzldxVdf0Gzw" alt="User avatar small" />
              <div className="mc-typing-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>

          <div className="mc-input-wrap">
            <div className="mc-input-shell">
              <button type="button" className="mc-input-icon-btn" aria-label="Attach"><Plus size={18} /></button>
              <input type="text" placeholder="Write a message of grace..." />
              <div className="mc-input-actions">
                <button type="button" className="mc-input-icon-btn" aria-label="Emoji"><Smile size={18} /></button>
                <button type="button" className="mc-send-btn" aria-label="Send message"><Send size={16} /></button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mc-mobile-menu-fab" aria-hidden="true">
        <Menu size={19} />
      </div>
    </div>
  );
};

export default MemberChat;
