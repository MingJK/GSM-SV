"use client"

import { DocsLayout } from "@/components/docs/docs-layout"

export default function SshKeyPage() {
  return (
    <DocsLayout>
      <h1>SSH Key 등록</h1>

      <h2>SSH Key란?</h2>
      <p>
        SSH Key는 비밀번호 대신 사용할 수 있는 안전한 인증 방식입니다.
        공개키(Public Key)와 개인키(Private Key) 쌍으로 구성되며,
        공개키를 VM에 등록하면 비밀번호 없이 SSH 접속이 가능합니다.
      </p>

      <h2>SSH Key 생성</h2>
      <p>
        터미널(Windows는 PowerShell)에서 아래 명령어를 실행합니다.{" "}
        <code>-f</code> 옵션으로 파일 경로를 지정하면 기존 키(GitHub 등)를 덮어쓰지 않습니다.
      </p>
      <pre><code>ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_gsmsv</code></pre>
      <blockquote>
        <p>
          이미 SSH Key가 없다면 <code>-f</code> 옵션 없이 <code>ssh-keygen -t ed25519</code>만 실행해도 됩니다.
          <br />만약 <code>Overwrite (y/n)?</code> 메시지가 뜨면 같은 경로에 키가 이미 존재한다는 뜻입니다.
          <br /><strong>n</strong>을 입력하고 <code>-f</code> 옵션으로 다른 경로를 지정하세요.
          <br />덮어쓰면 기존 키(GitHub 등)가 사라집니다.
        </p>
      </blockquote>
      <p>
        패스프레이즈를 입력합니다. 설정하지 않으려면 Enter를 누르세요.
      </p>

      <h3>생성된 키 확인</h3>
      <p>지정한 경로에 두 개의 파일이 생성됩니다.</p>
      <table>
        <thead>
          <tr>
            <th>파일</th>
            <th>설명</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>~/.ssh/id_ed25519_gsmsv</code></td>
            <td>개인키 (절대 공유하지 마세요)</td>
          </tr>
          <tr>
            <td><code>~/.ssh/id_ed25519_gsmsv.pub</code></td>
            <td>공개키 (VM에 등록할 키)</td>
          </tr>
        </tbody>
      </table>

      <h2>공개키 복사</h2>
      <p>공개키 내용을 클립보드에 복사합니다.</p>

      <h3>Windows</h3>
      <pre><code>Get-Content ~/.ssh/id_ed25519_gsmsv.pub | Set-Clipboard</code></pre>

      <h3>macOS</h3>
      <pre><code>cat ~/.ssh/id_ed25519_gsmsv.pub | pbcopy</code></pre>

      <h3>Linux</h3>
      <pre><code>cat ~/.ssh/id_ed25519_gsmsv.pub | xclip -selection clipboard</code></pre>

      <h2>VM에 공개키 등록</h2>
      <p>비밀번호로 VM에 먼저 접속한 뒤, 공개키를 등록합니다.</p>

      <h3>1. VM에 SSH 접속</h3>
      <pre><code>ssh ubuntu@192.168.0.100 -p &lt;SSH 포트&gt;</code></pre>

      <h3>2. authorized_keys 파일에 공개키 추가</h3>
      <pre><code>mkdir -p ~/.ssh && chmod 700 ~/.ssh{"\n"}echo "여기에_공개키_내용_붙여넣기" &gt;&gt; ~/.ssh/authorized_keys{"\n"}chmod 600 ~/.ssh/authorized_keys</code></pre>

      <h3>3. 접속 테스트</h3>
      <p>새 터미널을 열고 비밀번호 없이 접속되는지 확인합니다.</p>
      <pre><code>ssh -i ~/.ssh/id_ed25519_gsmsv ubuntu@192.168.0.100 -p &lt;SSH 포트&gt;</code></pre>
      <blockquote>
        <p>비밀번호 입력 없이 바로 접속되면 SSH Key 등록이 완료된 것입니다.</p>
      </blockquote>

      <h2>비밀번호 인증 비활성화 (권장)</h2>
      <p>
        SSH Key 접속이 정상적으로 되는 것을 확인한 뒤, 비밀번호 인증을 비활성화하면 보안이 크게 강화됩니다.
      </p>
      <pre><code>sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config.d/60-cloudimg-settings.conf{"\n"}sudo systemctl restart sshd</code></pre>

      <h2>주의 사항</h2>
      <ul>
        <li><strong>개인키는 절대 공유하지 마세요.</strong> 개인키가 유출되면 누구나 VM에 접속할 수 있습니다.</li>
        <li>패스프레이즈를 설정하면 키가 유출되더라도 추가 보안이 제공됩니다.</li>
      </ul>
    </DocsLayout>
  )
}
